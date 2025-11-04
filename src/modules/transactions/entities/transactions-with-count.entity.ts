import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Transaction } from './transaction.entity';

@ObjectType()
export class TransactionsWithCount {
  @Field(() => Int)
  count: number;

  @Field(() => [Transaction])
  transactions: Transaction[];
}
