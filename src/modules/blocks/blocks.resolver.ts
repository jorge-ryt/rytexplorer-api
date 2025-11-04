import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { BlocksService } from './blocks.service';
import { Block } from './entities/block.entity';
import { BlocksWithCount } from './entities/blocks-with-count.entity';

@Resolver(() => Block)
export class BlocksResolver {
  constructor(private readonly blocksService: BlocksService) {}

  @Query(() => BlocksWithCount)
  blocks(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('lastId', { type: () => String, nullable: true }) lastId?: string,
  ) {
    return this.blocksService.getBlocks(limit, lastId);
  }

  @Query(() => Block, { nullable: true })
  blockByNumber(@Args('blockNumber', { type: () => Int }) blockNumber: string) {
    return this.blocksService.getBlockByNumber(blockNumber);
  }
}
