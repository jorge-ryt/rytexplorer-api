import { Module, Global } from '@nestjs/common';
import { RedisService } from '@Redis/redis.service';

@Global() // makes it available app-wide without re-imports
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
