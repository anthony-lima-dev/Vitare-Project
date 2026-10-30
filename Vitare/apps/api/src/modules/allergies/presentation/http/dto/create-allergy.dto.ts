import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  severity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
