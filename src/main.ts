import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';

import compression from 'compression';
import helmet from 'helmet';

import { AllExceptionsFilter } from '@Filters/all-exceptions.filter';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.SERVER_PORT || 3000;

  app.use(helmet());
  app.use(compression());
  app.enableCors();
  // Global error handling
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(port);
  Logger.log(`🚀 RYT Explorer API running on http://localhost:${port}/graphql`);
}
void bootstrap();
