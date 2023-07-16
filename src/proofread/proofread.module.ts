import { Module } from '@nestjs/common';
import { ProofreadService } from './proofread.service';
import { AiCheckService } from './aiCheck.service';
import { ProofreadController } from './proofread.controller';
import { Proofread } from './entities/proofread.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createClient } from 'redis';

@Module({
  imports: [TypeOrmModule.forFeature([Proofread])],
  controllers: [ProofreadController],
  providers: [
    ProofreadService,
    AiCheckService,
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
  ],
})
export class ProofreadModule {}
