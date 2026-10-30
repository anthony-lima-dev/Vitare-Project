import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchMedicationDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Digite ao menos 2 caracteres para buscar' })
  @MaxLength(100)
  search?: string;
}
