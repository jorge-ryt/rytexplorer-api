import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { graphqlConfig } from '@Config/graphql.config';

@Module({
  imports: [GraphQLModule.forRoot(graphqlConfig)],
})
export class GqlModule {}
