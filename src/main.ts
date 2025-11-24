import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';

import compression from 'compression';
import express from 'express';
import helmet from 'helmet';

import { AllExceptionsFilter } from '@Filters/all-exceptions.filter';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  const port = process.env.SERVER_PORT || 3000;

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  // Global error handling
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(port);
  Logger.log(`🚀 RYT Explorer API running on http://localhost:${port}/graphql`);
}
void bootstrap();
