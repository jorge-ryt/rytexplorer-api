import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import WebSocket from 'ws';

import { RedisService } from '@Redis/redis.service';

@Injectable()
export class IndexerGateway implements OnModuleInit, OnModuleDestroy {
  private ws: WebSocket;
  private url = process.env.RPC_WS_URL || 'ws://localhost:8050/ws/v2';

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => console.log('✅ Connected to RPC WebSocket'));
    this.ws.on('close', () => {
      console.warn('⚠️  RPC WebSocket closed — reconnecting...');
      setTimeout(() => this.connect(), 5000);
    });
    this.ws.on('error', (err) => console.error('❌ WS error:', err));

    this.ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.transaction_ballot) {
          await this.redisService.set(
            `mempool:${data.transaction_ballot.hash}`,
            data.transaction_ballot,
            60,
          );
        } else if (data.block) {
          await this.redisService.set(
            `block:${data.block.block_hash}`,
            data.block,
            300,
          );
        }
      } catch (err) {
        console.error('Error processing WS message:', err);
      }
    });
  }

  onModuleDestroy() {
    this.ws?.close();
  }
}
