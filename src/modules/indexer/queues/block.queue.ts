import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Block } from '@prisma/client';
import { RedisService } from '../../../redis/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WsBroadcastGateway } from '../indexer.ws-broadcast.gateway';

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
        // eslint-disable-next-line no-eval
        const evaluated = eval('(' + raw + ')');
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

          // Prepare data mapping — keep fields as strings as in your examples
          const createData: any = {
            id: block.id ?? String(block.block_number ?? blockNumber),
            version: block.version ?? null,
            merkle_root: block.merkle_root ?? null,
            block_number: String(block.block_number ?? blockNumber),
            block_status: block.block_status ?? null,
            previous_hash: block.previous_hash ?? null,
            state_root: block.state_root ?? null,
            transaction_root: block.transaction_root ?? null,
            reciept_root: block.reciept_root ?? null,
            timestamp: block.timestamp ?? null,
            logs_bloom: block.logs_bloom ?? null,
            transactions: block.transactions ?? null, // if your Prisma field supports JSON
            block_reward: block.block_reward ?? null,
            value: block.value ?? null,
            data: block.data ?? null,
            to: block.to ?? null,
            block_hash: block.block_hash ?? blockHash ?? null,
          };

          // If your Prisma Block model stores transactions as Json, you can pass it through.
          // adjust fields based on your Prisma schema shape or types.
          await this.prisma.block.create({
            data: createData,
          });

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
