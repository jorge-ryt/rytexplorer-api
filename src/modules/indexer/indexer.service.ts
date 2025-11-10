import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import WebSocket from 'ws';
import { RedisService } from '../../redis/redis.service';
import { WsBroadcastGateway } from './indexer.ws-broadcast.gateway';
import { MempoolQueue } from './queues/mempool.queue';
import { BlockQueue } from './queues/block.queue';
import { TransactionQueue } from './queues/transaction.queue';

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private sockets: WebSocket[] = [];
  private running = true;

  constructor(
    private readonly redisService: RedisService,
    private readonly wsGateway: WsBroadcastGateway,
    private readonly mempoolQueue: MempoolQueue,
    private readonly blockQueue: BlockQueue,
    private readonly transactionQueue: TransactionQueue,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Starting IndexerService...');
    const nodeBase = process.env.NODE_URL ?? 'localhost';

    const urls = [
      `ws://${nodeBase}:8010/ws/v2`,
      `ws://${nodeBase}:8020/ws/v2`,
      `ws://${nodeBase}:8030/ws/v2`,
      `ws://${nodeBase}:8040/ws/v2`,
      `ws://${nodeBase}:8050/ws/v2`,
    ];

    urls.forEach((u) => this.listenToRPCSocket(u));
  }

  async onModuleDestroy() {
    this.running = false;
    this.logger.log('🛑 Stopping IndexerService and closing sockets...');
    this.sockets.forEach((s) => s.close());
  }

  private listenToRPCSocket(url: string) {
    const socket = new WebSocket(url);
    this.sockets.push(socket);
    const redis = this.redisService.getClient();

    socket.on('open', () => {
      this.logger.log(`✅ Connected to RPC WebSocket: ${url}`);
    });

    socket.on('message', async (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        const type = parsed.type;
        const data = parsed.data;

        switch (type) {
          case 'mempool_transaction':
            // Enqueue for mempool processing (producer)
            await this.mempoolQueue.enqueue(data);
            // Also optional: broadcast immediate mempool event to frontend
            this.wsGateway.broadcast('unconfirmed-transactions', data);
            break;

          case 'transaction_ballot':
            await this.transactionQueue.enqueue(data);
            this.wsGateway.broadcast('transaction_ballot', data);
            break;

          case 'finalized_block':
            // parsed.data.block is used in old code; handle both shapes
            const block = data.block ?? data;
            await this.blockQueue.enqueue(block);
            this.wsGateway.broadcast('finalized_block', block);
            // If there are transactions array, optionally enqueue to transaction queue:
            if (
              data.transactions_array &&
              Array.isArray(data.transactions_array)
            ) {
              // push each transaction object (match old behaviour)
              for (const tx of data.transactions_array) {
                // your old code actually added TransferObj style objects; adjust if needed
                await this.transactionQueue.enqueue(tx);
              }
            }
            break;

          default:
            this.logger.debug(`RPC message: unhandled type ${type}`);
        }
      } catch (err) {
        this.logger.error('Error processing RPC message: ' + err);
      }
    });

    socket.on('close', () => {
      this.logger.warn(`Socket closed: ${url}. Reconnecting in 5s...`);
      setTimeout(() => this.listenToRPCSocket(url), 5000);
    });

    socket.on('error', (err) => {
      this.logger.error(`WebSocket error (${url}): ${err?.message ?? err}`);
    });
  }
}
