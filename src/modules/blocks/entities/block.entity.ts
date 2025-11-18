import { ObjectType, Field } from '@nestjs/graphql';

import { Transaction } from '@Modules/transactions/entities/transaction.entity';

@ObjectType()
export class Block {
  @Field(() => String)
  id: string;

  @Field(() => String)
  version: string;

  @Field(() => String)
  merkle_root: string;

  @Field(() => String)
  block_number: string;

  @Field(() => String)
  block_status: string;

  @Field(() => String)
  previous_hash: string;

  @Field(() => String)
  state_root: string;

  @Field(() => String)
  transaction_root: string;

  @Field(() => String)
  reciept_root: string;

  @Field(() => String, { nullable: true })
  timestamp?: string | null;

  @Field(() => String)
  logs_bloom: string;

  @Field(() => [Transaction], { nullable: 'itemsAndList' })
  transactions: Transaction[];

  @Field(() => Number, { nullable: true })
  blockTxnsCount: number;

  @Field(() => String)
  block_reward: string;

  @Field(() => String)
  value: string;

  @Field(() => String)
  data: string;

  @Field(() => String)
  to: string;

  @Field(() => String)
  block_hash: string;
}
