import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GqlModule } from '@Graphql/gql.module';
import { BlocksModule } from '@Modules/blocks/blocks.module';
import { IndexerModule } from '@Modules/indexer/indexer.module';
import { TransactionsModule } from '@Modules/transactions/transactions.module';
import { WalletAuthModule } from './modules/wallet-auth/wallet-auth.module';
import { PrismaModule } from '@Prisma/prisma.module';
import { RedisModule } from '@Redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GqlModule,
    IndexerModule,
    BlocksModule,
    TransactionsModule,
    WalletAuthModule,
    RedisModule,
  ],
})
export class AppModule {}
