import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { LegalActInput } from '../../../domain/entities/legal-act.entity';
import { RecordLegalActActType } from './record-legal-act.dto';

/**
 * Aceite de um único documento jurídico informado pelo cliente nos fluxos de
 * onboarding (cadastro de paciente, primeiro acesso, provisão de staff).
 * O servidor valida a versão e o hash do conteúdo contra os documentos vigentes.
 */
export class LegalActAcceptanceDto implements LegalActInput {
  @IsEnum(RecordLegalActActType, {
    message: 'Tipo de ato jurídico inválido.',
  })
  actType!: 'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'EXPLICIT_CONSENT';

  @IsString()
  @MaxLength(50)
  documentVersion!: string;

  @IsString()
  @MaxLength(64)
  contentHash!: string;
}

export class LegalActAcceptanceListDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalActAcceptanceDto)
  legalActs?: LegalActAcceptanceDto[];
}
