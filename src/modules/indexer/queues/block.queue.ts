import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import type { Block } from '@prisma/client';

import { IBlock, IBlockData } from '@Interfaces/blocks';
import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { TransactionQueue } from '@Modules/indexer/queues/transaction.queue';
import { PrismaService } from '@Prisma/prisma.service';
import { RedisService } from '@Redis/redis.service';

type ParsedPayload = IBlockData | { block: IBlockData };

@Injectable()
export class BlockQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockQueue.name);
  private running = true;
  private readonly queueKey =
    process.env.BLOCK_REDIS_QUEUE ?? 'blockRedisQueue';

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly wsBroadcast: WsBroadcastGateway,
    private readonly transactionQueue: TransactionQueue,
  ) {}

  /** Public API — enqueue a new block into Redis */
  async enqueue(blockData: IBlockData): Promise<void> {
    const redis = this.redisService.getClient();
    this.logger.debug(`🧱 blockData ${JSON.stringify(blockData)}`);
    try {
      if (!blockData) {
        this.logger.warn('Attempted to enqueue empty block data');
        return;
      }

      const serialized = JSON.stringify(blockData);
      await redis.rpush(this.queueKey, serialized);

      this.logger.debug(
        `🧱 Enqueued block ${blockData.block_number ?? blockData.block_hash}`,
      );
    } catch (err) {
      this.logger.error('Failed to enqueue block', err);
    }
  }

  onModuleInit() {
    this.logger.log(`Starting BlockQueue listener on ${this.queueKey}`);
    this.processQueue().catch((err) => {
      this.logger.error('BlockQueue startup error', err);
    });
  }

  onModuleDestroy() {
    this.running = false;
    this.logger.log('Stopping BlockQueue');
  }

  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Type guard to validate an object is a valid IBlockData */
  private isIBlockData(obj: unknown): obj is IBlockData {
    if (typeof obj !== 'object' || obj === null) return false;
    const b = obj as Record<string, unknown>;
    return (
      typeof b.block_hash === 'string' &&
      typeof b.block_number === 'number' &&
      typeof b.merkle_root === 'string'
    );
  }

  /** Parse and validate a payload (JSON or legacy eval) */
  private parsePayload(raw: string): ParsedPayload | null {
    // Try normal JSON parsing
    try {
      const parsed = JSON.parse(raw) as unknown;

      // Handle legacy { obj: {...} } wrapper
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'obj' in parsed &&
        this.isIBlockData((parsed as { obj: unknown }).obj)
      ) {
        return { block: (parsed as { obj: IBlockData }).obj };
      }

      if (this.isIBlockData(parsed)) return parsed;

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'block' in parsed &&
        this.isIBlockData((parsed as { block: unknown }).block)
      ) {
        return parsed as { block: IBlockData };
      }

      return null;
    } catch {
      // Try legacy eval-based format
      try {
        const evaluated = eval('(' + raw + ')') as unknown;
        if (
          typeof evaluated === 'object' &&
          evaluated !== null &&
          'obj' in evaluated &&
          this.isIBlockData((evaluated as { obj: unknown }).obj)
        ) {
          return { block: (evaluated as { obj: IBlockData }).obj };
        }
        if (this.isIBlockData(evaluated)) return evaluated;
        if (
          typeof evaluated === 'object' &&
          evaluated !== null &&
          'block' in evaluated &&
          this.isIBlockData((evaluated as { block: unknown }).block)
        ) {
          return evaluated as { block: IBlockData };
        }
        return null;
      } catch (err) {
        this.logger.error('Failed to parse Redis block payload', err);
        return null;
      }
    }
  }

  private async processQueue(): Promise<void> {
    const redis = this.redisService.getClient();

    while (this.running) {
      try {
        const length = await redis.llen(this.queueKey);
        if (length > 0) {
          const raw = await redis.lindex(this.queueKey, 0);
          if (!raw) {
            await redis.lpop(this.queueKey);
            continue;
          }

          const payload = this.parsePayload(raw);
          if (!payload) {
            this.logger.warn('Malformed block payload — dropping');
            await redis.lpop(this.queueKey);
            continue;
          }

          const block: IBlockData =
            'block' in payload ? payload.block : payload;

          const blockHash = block.block_hash;
          const blockNumber = block.block_number;

          if (!blockHash && !blockNumber) {
            this.logger.warn(
              'Block payload missing identifiers, dropping',
              block,
            );
            await redis.lpop(this.queueKey);
            continue;
          }

          let exists: Block | null = null;
          if (blockHash) {
            exists = await this.prisma.block
              .findUnique({ where: { block_hash: blockHash } })
              .catch(() => null);
          }

          if (!exists && blockNumber) {
            exists = await this.prisma.block
              .findFirst({
                where: { block_number: String(blockNumber) },
              })
              .catch(() => null);
          }

          if (exists) {
            this.logger.debug(
              `Duplicate block (skipping): ${blockHash ?? blockNumber}`,
            );
            await redis.lpop(this.queueKey);
            continue;
          }

          const txCount = Array.isArray(block.transactions)
            ? block.transactions.length
            : 0;

          const createData: IBlock = {
            id: BigInt(block.block_number ?? blockNumber),
            version: String(block.version ?? 1),
            merkle_root: block.merkle_root ?? null,
            block_number: String(block.block_number ?? blockNumber),
            block_status: 'confirmed',
            previous_hash: block.previous_hash ?? null,
            state_root: block.state_root ?? null,
            transaction_root: block.transaction_root ?? null,
            reciept_root: block.reciept_root ?? null,
            timestamp: block.timestamp ? String(block.timestamp) : undefined,
            logs_bloom: block.logs_bloom ?? null,
            block_reward: block.block_reward ?? null,
            value: block.value ?? null,
            data: block.data ?? null,
            to: block.to ?? null,
            block_hash: block.block_hash ?? blockHash ?? null,
            blockTxnsCount: txCount,
          };

          await this.prisma.block.create({ data: createData });

          if (txCount > 0) {
            this.logger.debug(
              `Processing ${block.transactions.length} transactions for block ${blockNumber}`,
            );

            for (const txHash of block.transactions) {
              const existingTx = await this.prisma.transaction.findUnique({
                where: { hash: txHash },
              });

              if (existingTx) {
                await this.prisma.transaction.update({
                  where: { hash: txHash },
                  data: {
                    block_number: String(blockNumber),
                    transaction_Status: 'Confirmed',
                  },
                });
                this.logger.debug(
                  `Updated transaction ${txHash} with block ${blockNumber}`,
                );
              } else {
                await this.transactionQueue.enqueue({
                  hash: txHash,
                  block_number: String(blockNumber),
                  transaction_Status: 'Confirmed',
                });
                this.logger.debug(
                  `Queued transaction ${txHash} for processing with block ${blockNumber}`,
                );
              }
            }
          }

          try {
            this.wsBroadcast.broadcast('new-block', block);
          } catch (err) {
            this.logger.warn('Broadcast failed for block', err);
          }

          this.logger.log(
            `Saved block ${createData.block_number} / ${createData.block_hash}`,
          );

          if (createData.block_hash) {
            await redis.sadd('seen_set_blocks', createData.block_hash);
          }
          await redis.lpop(this.queueKey);
        } else {
          await this.sleep(2000);
        }
      } catch (err) {
        this.logger.error('BlockQueue processing error', err);
        await this.sleep(2000);
      }
    }
  }
}
