import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { RedisModule } from '../../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { WsBroadcastGateway } from './indexer.ws-broadcast.gateway';
import { MempoolQueue } from './queues/mempool.queue';
import { BlockQueue } from './queues/block.queue';
import { TransactionQueue } from './queues/transaction.queue';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [
    IndexerService,
    WsBroadcastGateway,
    MempoolQueue,
    BlockQueue,
    TransactionQueue,
  ],
  exports: [IndexerService, WsBroadcastGateway],
})
export class IndexerModule {}
