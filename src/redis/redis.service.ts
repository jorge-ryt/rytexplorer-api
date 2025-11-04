import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_ENDPOINT || '127.0.0.1',
      port: 6379,
      reconnectOnError: () => true,
    });

    this.client.on('connect', () => console.log('✅ Redis connected'));
    this.client.on('error', (err) => console.error('❌ Redis error:', err));
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async flush(): Promise<void> {
    await this.client.flushdb();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async lpush(queue: string, value: any): Promise<number> {
    return this.client.lpush(queue, JSON.stringify(value));
  }

  async rpush(queue: string, value: any): Promise<number> {
    return this.client.rpush(queue, JSON.stringify(value));
  }

  async lpop<T>(queue: string): Promise<T | null> {
    const result = await this.client.lpop(queue);
    return result ? JSON.parse(result) : null;
  }

  async rpop<T>(queue: string): Promise<T | null> {
    const result = await this.client.rpop(queue);
    return result ? JSON.parse(result) : null;
  }

  async llen(queue: string): Promise<number> {
    return this.client.llen(queue);
  }

  async sadd(set: string, value: string): Promise<number> {
    return this.client.sadd(set, value);
  }

  async sismember(set: string, value: string): Promise<boolean> {
    const result = await this.client.sismember(set, value);
    return result === 1;
  }
}
