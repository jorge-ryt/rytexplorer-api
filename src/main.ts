import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.SERVER_PORT || 3000;

  app.use(helmet());
  app.use(compression());
  app.enableCors();

  await app.listen(port);
  Logger.log(`🚀 Rytexplorer API running on http://localhost:${port}/graphql`);
}
bootstrap();
