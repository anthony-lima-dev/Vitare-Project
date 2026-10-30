import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateForbiddenMedicationDto {
  @IsUUID()
  medicationsDictionaryId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
