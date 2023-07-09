import { Module } from '@nestjs/common';
import { ProofreadService } from './proofread.service';
import { ProofreadController } from './proofread.controller';
import { Proofread } from './entities/proofread.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Proofread])],
  controllers: [ProofreadController],
  providers: [ProofreadService],
})
export class ProofreadModule {}
