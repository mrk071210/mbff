import { PartialType } from '@nestjs/mapped-types';
import { CreateProofreadDto } from './create-proofread.dto';

export class UpdateProofreadDto extends PartialType(CreateProofreadDto) {}
