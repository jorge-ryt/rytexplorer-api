import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server } from 'ws';

@WebSocketGateway({ cors: true })
export class WsBroadcastGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WsBroadcastGateway.name);

  afterInit() {
    this.logger.log('✅ Broadcast WebSocket initialized');
  }

  handleConnection() {
    this.logger.log('🔌 Client connected');
  }

  handleDisconnect() {
    this.logger.log('❌ Client disconnected');
  }

  broadcast(topic: string, message: any) {
    const payload = JSON.stringify({ topic, message });
    this.server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  }
}
