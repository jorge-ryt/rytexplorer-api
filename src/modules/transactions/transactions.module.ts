import { Module } from '@nestjs/common';

import { TransactionsResolver } from '@Modules/transactions/transactions.resolver';
import { TransactionsService } from '@Modules/transactions/transactions.service';
import { PrismaModule } from '@Prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TransactionsResolver, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
