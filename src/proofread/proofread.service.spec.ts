import { Test, TestingModule } from '@nestjs/testing';
import { ProofreadService } from './proofread.service';

describe('ProofreadService', () => {
  let service: ProofreadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProofreadService],
    }).compile();

    service = module.get<ProofreadService>(ProofreadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
