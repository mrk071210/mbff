import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inject, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { RedisClientType } from 'redis';

@WebSocketGateway(3002, {
  path: '/check',
  allowEIO3: true,
  cors: {
    origin: /.*/,
    allowedHeaders: /.*/,
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('AppGateway');

  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  @WebSocketServer() server: Server;

  @SubscribeMessage('events')
  handleEvent(@MessageBody() data: string): string {
    return data;
  }

  @SubscribeMessage('getResult')
  async handleResult(
    @MessageBody() data: { taskId: string; end: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    let timer = setInterval(async () => {
      const item = await this.redisClient.LRANGE(data.taskId, 0, 1);
      if (!client.connected) {
        timer = null;
        return;
      }
      client.emit(data.taskId, item);
    }, 1000);
  }

  afterInit(server: Socket) {
    this.logger.log('Init');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
