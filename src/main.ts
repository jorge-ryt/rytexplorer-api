import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.SERVER_PORT || 3000;

  app.use(helmet());
  app.use(compression());
  app.enableCors();
  // Global error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
  Logger.log(`🚀 Rytexplorer API running on http://localhost:${port}/graphql`);
}
bootstrap();
