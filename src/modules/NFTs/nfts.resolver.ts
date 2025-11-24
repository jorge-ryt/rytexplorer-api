import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { NftsTop } from '@Modules/NFTs/entities/nfts-top.entity';
import { Nfts } from '@Modules/NFTs/entities/nfts.entity';
import { NftsService } from '@Modules/NFTs/nfts.service';

@Resolver(() => Nfts)
export class NftsResolver {
  constructor(private readonly nftsService: NftsService) {}

  @Query(() => NftsTop)
  getTop(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('lastId', { type: () => String, nullable: true }) lastId?: string,
  ) {
    return this.nftsService.getTop(limit, lastId);
  }
}
