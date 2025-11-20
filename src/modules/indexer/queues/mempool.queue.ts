import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import serialize from 'serialize-javascript';

import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { RedisService } from '@Redis/redis.service';
import { normalizeTxData, extractTxHash } from '@Utils/tx-utils';

@Injectable()
export class MempoolQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MempoolQueue.name);
  private running = true;
  private readonly queueName =
    process.env.MEMPOOL_REDIS_QUEUE ?? 'mempoolRedisQueue';

  constructor(
    private readonly redisService: RedisService,
    private readonly gateway: WsBroadcastGateway,
  ) {}

  // Producer API: enqueue into redis list
  async enqueue(item: any) {
    const hash = extractTxHash(item);
    if (!hash) {
      this.logger.warn(
        `[MempoolQueue] Skipping enqueue — transaction has no hash: ${JSON.stringify(item)}`,
      );
      return;
    }

    const serialized = serialize({ obj: item });
    const redis = this.redisService.getClient();
    await redis.rpush(this.queueName, serialized);
    this.logger.debug(`Enqueued mempool tx ${hash} -> ${this.queueName}`);
  }

  // Consumer API: process items from redis list
  onModuleInit() {
    this.logger.log(`Starting mempool queue listener on ${this.queueName}`);
    this.processQueue(this.queueName);
  }

  // Graceful shutdown
  onModuleDestroy() {
    this.running = false;
    this.logger.log('Stopping mempool queue listener');
  }

  // Utility: sleep
  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Core: process queue items
  private async processQueue(queue: string) {
    const redis = this.redisService.getClient();

    while (this.running) {
      const length = await redis.llen(queue);
      if (length > 0) {
        const value = await redis.lindex(queue, 0);
        if (!value) {
          await redis.lpop(queue);
          continue;
        }

        // Deserialize item
        let deserialized: any;
        try {
          deserialized = JSON.parse(value);
        } catch {
          try {
            deserialized = eval(`(${value})`);
          } catch (err) {
            this.logger.error(
              'Failed to parse mempool queue item, removing corrupt item',
              err,
            );
            await redis.lpop(queue);
            continue;
          }
        }

        // Check for hash
        const tx = deserialized.obj ?? deserialized;
        const hash = extractTxHash(tx);
        if (!hash) {
          this.logger.warn('Mempool queue item without hash, removing');
          await redis.lpop(queue);
          continue;
        }

        // Check for duplicates
        const seen = await redis.sismember('seen_set_mempool', hash);
        if (seen) {
          this.logger.debug(`Duplicate mempool tx — removing ${hash}`);
          await redis.lpop(queue);
          continue;
        }

        this.logger.debug(`Processing new mempool tx: ${hash}`);
        // ✅ Normalize transaction data here
        const normalizedTx = normalizeTxData(tx);
        // broadcast to frontend clients
        this.gateway.broadcast('unconfirmed-transactions', normalizedTx);

        // mark as seen
        await redis.sadd('seen_set_mempool', hash);
        await redis.lpop(queue);
      } else {
        await this.sleep(2000);
      }
    }
  }
}
