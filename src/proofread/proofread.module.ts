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
            host: '127.0.0.1',
            port: 6379,
          },
        });
        await client.connect();
        return client;
      },
    },
  ],
})
export class ProofreadModule {}
