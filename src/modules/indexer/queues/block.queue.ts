import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import type { Block } from '@prisma/client';

import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { TransactionQueue } from '@Modules/indexer/queues/transaction.queue';
import { PrismaService } from '@Prisma/prisma.service';
import { RedisService } from '@Redis/redis.service';

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
  async enqueue(blockData: any): Promise<void> {
    const redis = this.redisService.getClient();

    try {
      if (!blockData) {
        this.logger.warn('Attempted to enqueue empty block data');
        return;
      }

      // Serialize safely
      const serialized = JSON.stringify(blockData);
      await redis.rpush(this.queueKey, serialized);

      this.logger.debug(
        `🧱 Enqueued block ${blockData.block_number ?? blockData.blockHash}`,
      );
    } catch (err) {
      this.logger.error('Failed to enqueue block', err);
    }
  }

  onModuleInit() {
    this.logger.log(`Starting BlockQueue listener on ${this.queueKey}`);
    // start asynchronously (don't await)
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

  /**
   * Parse payload supporting:
   * - JSON.parseable strings
   * - serialize-javascript output (e.g. "({ obj: { ... } })")
   */
  private parsePayload(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      // if the producer used a wrapper { obj: ... } keep that
      if (parsed && parsed.obj) return parsed.obj;
      return parsed;
    } catch (e) {
      // fallback to eval for serialize-javascript format (legacy)
      try {
        const evaluated = eval(`(${raw})`);
        if (evaluated && evaluated.obj) return evaluated.obj;
        return evaluated;
      } catch (ee) {
        this.logger.error('Failed to parse Redis block payload', ee);
        return null;
      }
    }
  }

  private async processQueue() {
    const redis = this.redisService.getClient();

    while (this.running) {
      try {
        const length = await redis.llen(this.queueKey);
        if (length > 0) {
          const raw = await redis.lindex(this.queueKey, 0);
          if (!raw) {
            // race/empty slot
            await redis.lpop(this.queueKey);
            continue;
          }

          const payload = this.parsePayload(raw);
          if (!payload) {
            // malformed payload — drop it to avoid blocking queue
            this.logger.warn('Malformed block payload — dropping');
            await redis.lpop(this.queueKey);
            continue;
          }

          // payload shape could be block or { block: ... } depending on producer
          const block = payload.block ?? payload;

          // Ensure we have block_hash and block_number
          const blockHash = block.block_hash ?? block.blockHash ?? null;
          const blockNumber = block.block_number ?? block.blockNumber ?? null;

          if (!blockHash && !blockNumber) {
            this.logger.warn(
              'Block payload missing identifiers, dropping',
              block,
            );
            await redis.lpop(this.queueKey);
            continue;
          }

          // Avoid duplicate by block_hash if available, else by block_number
          let exists: Block | null = null;
          if (blockHash) {
            exists = await this.prisma.block
              .findUnique({
                where: { block_hash: blockHash },
              })
              .catch(() => null);
          }
          if (!exists && blockNumber) {
            // fallback to checking by block_number
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
            // pop and continue
            await redis.lpop(this.queueKey);
            continue;
          }

          // count transactions
          const txCount =
            Array.isArray(block.transactions) && block.transactions.length
              ? block.transactions.length
              : 0;

          // Prepare data mapping — keep fields as strings as in your examples
          const createData: any = {
            id: block.id ?? String(block.block_number ?? blockNumber),
            version: String(block.version ?? 1),
            merkle_root: block.merkle_root ?? null,
            block_number: String(block.block_number ?? blockNumber),
            block_status: block.block_status ?? 'confirmed',
            previous_hash: block.previous_hash ?? null,
            state_root: block.state_root ?? null,
            transaction_root: block.transaction_root ?? null,
            reciept_root: block.reciept_root ?? null,
            timestamp: block.timestamp ? String(block.timestamp) : null,
            logs_bloom: block.logs_bloom ?? null,
            block_reward: block.block_reward ?? null,
            value: block.value ?? null,
            data: block.data ?? null,
            to: block.to ?? null,
            block_hash: block.block_hash ?? blockHash ?? null,
            blockTxnsCount: txCount,
          };

          // Save to database
          await this.prisma.block.create({
            data: createData,
          });

          // Process block's transactions if present
          if (txCount > 0) {
            this.logger.debug(
              `Processing ${block.transactions.length} transactions for block ${blockNumber}`,
            );

            for (const txHash of block.transactions) {
              // Check if transaction exists
              const existingTx = await this.prisma.transaction.findUnique({
                where: { hash: txHash },
              });

              if (existingTx) {
                // Update existing transaction with block info
                await this.prisma.transaction.update({
                  where: { hash: txHash },
                  data: {
                    block_number: String(blockNumber),
                    transaction_Status: 'Confirmed', // Update status since it's now in a block
                  },
                });
                this.logger.debug(
                  `Updated transaction ${txHash} with block ${blockNumber}`,
                );
              } else {
                // If transaction doesn't exist, queue it for processing
                // The transaction queue will handle fetching full details
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

          // broadcast to websocket clients
          try {
            this.wsBroadcast.broadcast('new-block', block);
          } catch (err) {
            this.logger.warn('Broadcast failed for block', err);
          }

          this.logger.log(
            `Saved block ${createData.block_number} / ${createData.block_hash}`,
          );
          // mark as seen (optional) and pop the queue
          if (createData.block_hash)
            await redis.sadd('seen_set_blocks', createData.block_hash);
          await redis.lpop(this.queueKey);
        } else {
          // no items
          await this.sleep(2000);
        }
      } catch (err) {
        this.logger.error('BlockQueue processing error', err);
        await this.sleep(2000);
      }
    }
  }
}
