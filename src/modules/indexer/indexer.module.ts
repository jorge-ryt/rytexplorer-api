import { Module } from '@nestjs/common';
import { IndexerService } from '@Modules/indexer/indexer.service';
import { RedisModule } from '@Redis/redis.module';
import { PrismaModule } from '@Prisma/prisma.module';
import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { MempoolQueue } from '@Modules/indexer/queues/mempool.queue';
import { BlockQueue } from '@Modules/indexer/queues/block.queue';
import { TransactionQueue } from '@Modules/indexer/queues/transaction.queue';

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
