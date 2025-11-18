import { join } from 'path';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { GraphQLLoggingPlugin } from '@Plugins/graphql-logging.plugin';

export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  playground: process.env.NODE_ENV !== 'production',
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [new GraphQLLoggingPlugin()],
};
