import { ObjectType, Field, Int } from '@nestjs/graphql';

import { Nfts } from '@Modules/NFTs/entities/nfts.entity';

ObjectType();
export class NftsTop {
  @Field(() => Int)
  count: number;

  @Field(() => [Nfts])
  topNfts: Nfts[];
}
