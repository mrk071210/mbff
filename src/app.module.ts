import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user/entities/user.entity';
import { UserModule } from './user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ProofreadModule } from './proofread/proofread.module';
import { Proofread } from './proofread/entities/proofread.entity';
import { createClient } from 'redis';
import { SocketGateway } from './sockets/sockets.gateway';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '42.193.131.165',
      port: 3306,
      username: 'root',
      password: 'Kk_071210',
      database: 'boom',
      synchronize: false,
      logging: true,
      entities: [User, Proofread],
      poolSize: 10,
      connectorPackage: 'mysql2',
      extra: {
        authPlugin: 'sha256_password',
      },
    }),
    JwtModule.register({
      global: true,
      secret: 'mmmrk',
      signOptions: {
        expiresIn: '30d',
      },
    }),
    UserModule,
    ProofreadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory() {
        const client = createClient({
          socket: {
            host: '42.193.131.165',
            port: 6379,
          },
          password: 'mjkk071210',
        });
        await client.connect();
        return client;
      },
    },
    SocketGateway,
  ],
})
export class AppModule {}
