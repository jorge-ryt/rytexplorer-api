import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GqlModule } from './graphql/gql.module';
import { PrismaModule } from './prisma/prisma.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GqlModule,
    BlocksModule,
    TransactionsModule,
    RedisModule,
  ],
})
export class AppModule {}
