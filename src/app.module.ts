import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GqlModule } from './graphql/gql.module';
import { PrismaModule } from './prisma/prisma.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletAuthModule } from './modules/wallet-auth/wallet-auth.module';
// import { AccountsModule } from './modules/accounts/accounts.module';
import { RedisModule } from './redis/redis.module';
import { IndexerModule } from './modules/indexer/indexer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GqlModule,
    IndexerModule,
    BlocksModule,
    TransactionsModule,
    WalletAuthModule,
    // AccountsModule,
    RedisModule,
  ],
})
export class AppModule {}
