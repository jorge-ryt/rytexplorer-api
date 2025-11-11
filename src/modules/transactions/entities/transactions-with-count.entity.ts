import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Transaction } from '@Modules/transactions/entities/transaction.entity';

@ObjectType()
export class TransactionsWithCount {
  @Field(() => Int)
  count: number;

  @Field(() => [Transaction])
  transactions: Transaction[];
}
