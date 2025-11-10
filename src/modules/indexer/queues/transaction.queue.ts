import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WsBroadcastGateway } from '../indexer.ws-broadcast.gateway';

@Injectable()
export class TransactionQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionQueue.name);
  private running = true;
  private readonly queueKey =
    process.env.TRANSACTION_REDIS_QUEUE ?? 'transactionRedisQueue';

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly wsBroadcast: WsBroadcastGateway,
  ) {}

  /** Public API — enqueue new transaction(s) into Redis */
  async enqueue(txData: any): Promise<void> {
    const redis = this.redisService.getClient();

    try {
      if (!txData) {
        this.logger.warn('Attempted to enqueue empty transaction data');
        return;
      }

      const serialized = JSON.stringify(txData);
      await redis.rpush(this.queueKey, serialized);

      const txHash = txData.hash ?? txData.transaction_hash ?? 'unknown';
      this.logger.debug(`💸 Enqueued transaction ${txHash}`);
    } catch (err) {
      this.logger.error('Failed to enqueue transaction', err);
    }
  }

  // Module lifecycle — start processing queue
  onModuleInit() {
    this.logger.log(`Starting TransactionQueue listener on ${this.queueKey}`);
    this.processQueue().catch((err) => {
      this.logger.error('TransactionQueue startup error', err);
    });
  }

  // Module lifecycle — stop processing queue
  onModuleDestroy() {
    this.running = false;
    this.logger.log('Stopping TransactionQueue');
  }

  // Utility: sleep
  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Utility: parse payload from Redis
  private parsePayload(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.obj) return parsed.obj;
      return parsed;
    } catch (e) {
      try {
        // eslint-disable-next-line no-eval
        const evaluated = eval('(' + raw + ')');
        if (evaluated && evaluated.obj) return evaluated.obj;
        return evaluated;
      } catch (ee) {
        this.logger.error('Failed to parse Redis tx payload', ee);
        return null;
      }
    }
  }

  // Core: process queue items
  private async processQueue() {
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
            this.logger.warn('Malformed tx payload — dropping');
            await redis.lpop(this.queueKey);
            continue;
          }

          // payload may be an array of txs, or an object representing one tx (depending on producer)
          const txItems = Array.isArray(payload)
            ? payload
            : (payload.data ?? payload);

          // normalize to array
          const txArray = Array.isArray(txItems) ? txItems : [txItems];

          for (const item of txArray) {
            const tx = item.TransferObj ?? item; // some payloads wrap actual transfer data inside TransferObj

            const txHash = tx.hash ?? tx.Hash ?? item.hash ?? item.Hash ?? null;
            if (!txHash) {
              this.logger.warn('Transaction missing hash, skipping', tx);
              continue;
            }

            const exists = await this.prisma.transaction
              .findUnique({
                where: { hash: txHash },
              })
              .catch(() => null);

            if (exists) {
              this.logger.debug(`Duplicate transaction (skipping): ${txHash}`);
              continue;
            }
            const blockNumber = String(
              item.block ?? item.block_number ?? item.blockNumber ?? '',
            );

            // Map your tx structure to Prisma create data
            const createData: any = {
              id: item.id ?? undefined,
              transaction_Status:
                item.transaction_Status ?? item.transactionStatus ?? 'Pending',
              hash: txHash,
              ...(blockNumber
                ? { block: { connect: { block_number: blockNumber } } }
                : {}),

              from: tx.from ?? item.from ?? null,
              to: tx.to ?? item.to ?? null,
              value: String(tx.value ?? item.value ?? '0'),
              transaction_time: item.transaction_time ?? null,
              functionType: item.functionType ?? item.type ?? null,
              unix_timestamp: item.unix_timestamp ?? null,
              Status: item.Status ?? null,
              State: item.State ?? null,
              nonce: String(tx.nonce ?? item.nonce ?? ''),
              type: String(tx.type ?? item.type ?? '0'),
              node_id: tx.node_id ?? item.node_id ?? null,
              gas: String(tx.gas ?? item.gas ?? '0'),
              gas_price: String(tx.gas_price ?? item.gas_price ?? '0'),
              input: tx.input ?? item.input ?? null,
            };

            // Create record
            await this.prisma.transaction.create({
              data: createData,
            });

            // broadcast
            try {
              this.wsBroadcast.broadcast('confirmed-transaction', createData);
            } catch (err) {
              this.logger.warn('Broadcast failed for transaction', err);
            }

            this.logger.log(`Saved tx ${txHash}`);
            // mark as seen
            await redis.sadd('seen_set_transactions', txHash);
          }

          // After processing batch, pop head element
          await redis.lpop(this.queueKey);
        } else {
          await this.sleep(2000);
        }
      } catch (err) {
        this.logger.error('TransactionQueue processing error', err);
        await this.sleep(2000);
      }
    }
  }
}
