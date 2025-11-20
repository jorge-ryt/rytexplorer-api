import { Module } from '@nestjs/common';

import { IndexerService } from '@Modules/indexer/indexer.service';
import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { BlockQueue } from '@Modules/indexer/queues/block.queue';
import { MempoolQueue } from '@Modules/indexer/queues/mempool.queue';
import { TransactionQueue } from '@Modules/indexer/queues/transaction.queue';
import { PrismaModule } from '@Prisma/prisma.module';
import { RedisModule } from '@Redis/redis.module';

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
