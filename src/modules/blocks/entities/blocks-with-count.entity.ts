import { ObjectType, Field, Int } from '@nestjs/graphql';

import { Block } from '@Modules/blocks/entities/block.entity';

@ObjectType()
export class BlocksWithCount {
  @Field(() => Int)
  count: number;

  @Field(() => [Block])
  blocks: Block[];
}
