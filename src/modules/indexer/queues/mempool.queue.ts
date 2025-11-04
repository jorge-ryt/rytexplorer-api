import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { WsBroadcastGateway } from '../indexer.ws-broadcast.gateway';
import serialize from 'serialize-javascript';

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
    const serialized = serialize({ obj: item });
    const redis = this.redisService.getClient();
    await redis.rpush(this.queueName, serialized);
    this.logger.debug(`Enqueued mempool tx ${item.hash} -> ${this.queueName}`);
  }

  async onModuleInit() {
    this.logger.log(`Starting mempool queue listener on ${this.queueName}`);
    this.processQueue(this.queueName);
  }

  async onModuleDestroy() {
    this.running = false;
    this.logger.log('Stopping mempool queue listener');
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processQueue(queue: string) {
    const redis = this.redisService.getClient();

    while (this.running) {
      const length = await redis.llen(queue);
      if (length > 0) {
        const value = await redis.lindex(queue, 0);
        if (!value) {
          // possible race, pop and continue
          await redis.lpop(queue);
          continue;
        }

        let deserialized: any;
        try {
          deserialized = JSON.parse(value);
        } catch {
          // older code used serialize(), which may produce JS that isn't pure JSON.
          // If your items were saved with serialize-javascript, you'll need to
          // `eval` or use a compatible deserializer. For safety we attempt JSON parse,
          // falling back to eval only if necessary (be cautious with eval).
          try {
            // eslint-disable-next-line no-eval
            deserialized = eval('(' + value + ')');
          } catch (err) {
            this.logger.error(
              'Failed to parse mempool queue item, removing corrupt item',
              err,
            );
            await redis.lpop(queue);
            continue;
          }
        }

        const hash = deserialized?.obj?.hash ?? deserialized.hash;
        if (!hash) {
          this.logger.warn('Mempool queue item without hash, removing');
          await redis.lpop(queue);
          continue;
        }

        const seen = await redis.sismember('seen_set_mempool', hash);
        if (seen) {
          this.logger.debug(`Duplicate mempool tx — removing ${hash}`);
          await redis.lpop(queue);
          continue;
        }

        this.logger.debug(`Processing new mempool tx: ${hash}`);
        // broadcast to frontend clients
        this.gateway.broadcast(
          'unconfirmed-transactions',
          deserialized.obj?.data ?? deserialized.data ?? deserialized,
        );

        await redis.sadd('seen_set_mempool', hash);
        await redis.lpop(queue);
      } else {
        await this.sleep(2000);
      }
    }
  }
}
