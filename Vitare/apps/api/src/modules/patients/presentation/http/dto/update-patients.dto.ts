import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsNumber,
  Max,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  BLOOD_TYPES,
  type BloodType,
} from '../../../../../common/constants/blood-types';
import { LegalActAcceptanceDto } from '../../../../../../src/modules/legal/presentation/http/dto/legal-act-acceptance.dto';

/** 11 dígitos numéricos, com ou sem máscara — normalizado antes da validação no Service */
const CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

const PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn([...BLOOD_TYPES], {
    message: 'Tipo sanguíneo inválido. Use A+, A-, B+, B-, AB+, AB-, O+ ou O-.',
  })
  @MaxLength(5)
  bloodType?: BloodType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsString()
  @Matches(CPF_PATTERN, {
    message: 'CPF deve conter 11 dígitos, com ou sem máscara',
  })
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(PHONE_PATTERN, {
    message: 'Telefone deve estar no formato (11) 1234-5678 ou (11) 91234-5678',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  /**
   * Aceites de onboarding informados no primeiro acesso (ou re-aceite).
   * São gravados na mesma transação da atualização do perfil.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalActAcceptanceDto)
  legalActs?: LegalActAcceptanceDto[];
}
