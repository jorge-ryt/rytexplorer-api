import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GqlModule } from '@Graphql/gql.module';
import { PrismaModule } from '@Prisma/prisma.module';
import { BlocksModule } from '@Modules/blocks/blocks.module';
import { TransactionsModule } from '@Modules/transactions/transactions.module';
// import { AccountsModule } from '@Modules/accounts/accounts.module';
import { RedisModule } from '@Redis/redis.module';
import { IndexerModule } from '@Modules/indexer/indexer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GqlModule,
    IndexerModule,
    BlocksModule,
    TransactionsModule,
    // AccountsModule,
    RedisModule,
  ],
})
export class AppModule {}
