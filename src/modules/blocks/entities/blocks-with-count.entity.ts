import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Block } from './block.entity';

@ObjectType()
export class BlocksWithCount {
  @Field(() => Int)
  count: number;

  @Field(() => [Block])
  blocks: Block[];
}
