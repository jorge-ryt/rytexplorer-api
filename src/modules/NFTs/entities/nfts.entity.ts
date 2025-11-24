import { ObjectType, Field } from '@nestjs/graphql';

ObjectType();
export class Nfts {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  min_price: string;

  @Field(() => String)
  max_price: string;

  @Field(() => String)
  transfers: string;

  @Field(() => String)
  owners: string;

  @Field(() => String)
  total_assets: string;
}
