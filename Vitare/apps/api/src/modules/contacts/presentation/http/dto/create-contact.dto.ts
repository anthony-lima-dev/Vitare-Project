import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;

export class CreateContactDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(30)
  @Matches(PHONE_PATTERN, {
    message: 'Telefone deve estar no formato (11) 1234-5678 ou (11) 91234-5678',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
