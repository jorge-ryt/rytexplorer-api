import { Plugin } from '@nestjs/apollo';
import { ApolloServerPlugin } from '@apollo/server';
import { Logger } from '@nestjs/common';

@Plugin()
export class GraphQLLoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger('GraphQL');

  async requestDidStart(requestContext) {
    const { request } = requestContext;
    const operationName = request.operationName || 'AnonymousOperation';
    const logger = this.logger;

    logger.log(`➡️  ${operationName} started`);

    const start = Date.now(); // measure duration manually

    return {
      async willSendResponse() {
        const duration = `${(Date.now() - start).toFixed(2)}ms`;
        logger.log(`✅  ${operationName} finished in ${duration}`);
      },
    };
  }
}
