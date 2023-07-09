import { Test, TestingModule } from '@nestjs/testing';
import { ProofreadController } from './proofread.controller';
import { ProofreadService } from './proofread.service';

describe('ProofreadController', () => {
  let controller: ProofreadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProofreadController],
      providers: [ProofreadService],
    }).compile();

    controller = module.get<ProofreadController>(ProofreadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
