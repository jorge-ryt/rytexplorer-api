import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class Transaction {
  @Field(() => String)
  id: string;

  @Field(() => String)
  transaction_Status: string;

  @Field(() => String)
  hash: string;

  @Field(() => String, { nullable: true })
  block?: string | null;

  @Field(() => String)
  from: string;

  @Field(() => String)
  to: string;

  @Field(() => String)
  value: string;

  @Field(() => String, { nullable: true })
  transaction_time?: string | null;

  @Field(() => String)
  functionType: string;

  @Field(() => String, { nullable: true })
  unix_timestamp?: string | null;

  @Field(() => Boolean, { nullable: true })
  Status?: boolean | null;

  @Field(() => Boolean, { nullable: true })
  State?: boolean | null;

  @Field(() => String)
  nonce: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  node_id: string;

  @Field(() => String)
  gas: string;

  @Field(() => String)
  gas_price: string;

  @Field(() => String)
  input: string;
}
