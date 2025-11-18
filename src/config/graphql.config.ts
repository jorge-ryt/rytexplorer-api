import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { GraphQLLoggingPlugin } from '../common/plugins/graphql-logging.plugin';

export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
  playground: process.env.NODE_ENV !== 'production',
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [new GraphQLLoggingPlugin()],
};
