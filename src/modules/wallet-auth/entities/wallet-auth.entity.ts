import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class WalletUserEntity {
  @Field(() => ID)
  id: string;

  @Field()
  address: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
