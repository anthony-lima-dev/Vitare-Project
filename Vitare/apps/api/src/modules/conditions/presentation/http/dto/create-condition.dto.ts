import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConditionDto {
  @IsUUID()
  diseaseId!: string;

  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
