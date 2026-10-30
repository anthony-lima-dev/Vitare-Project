import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';

export enum RecordLegalActActType {
  TERMS_OF_USE = 'TERMS_OF_USE',
  PRIVACY_NOTICE = 'PRIVACY_NOTICE',
  EXPLICIT_CONSENT = 'EXPLICIT_CONSENT',
}

export enum RecordLegalActLegalBasis {
  CONSENT = 'CONSENT',
  CONTRACT = 'CONTRACT',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTEREST = 'VITAL_INTEREST',
  PUBLIC_TASK = 'PUBLIC_TASK',
  LEGITIMATE_INTEREST = 'LEGITIMATE_INTEREST',
  EXERCISE_OF_RIGHTS = 'EXERCISE_OF_RIGHTS',
}

export class RecordLegalActDto {
  @IsUUID()
  actorId!: string;

  @IsString()
  @MaxLength(40)
  actorRole!: string;

  @IsUUID()
  holderId!: string;

  @IsEnum(RecordLegalActActType)
  actType!: RecordLegalActActType;

  @IsString()
  @MaxLength(50)
  documentVersion!: string;

  @IsString()
  @MaxLength(64)
  contentHash!: string;

  @IsString()
  @MaxLength(200)
  purpose!: string;

  @IsEnum(RecordLegalActLegalBasis)
  legalBasis!: RecordLegalActLegalBasis;

  @IsString()
  @MaxLength(100)
  origin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipHash?: string | null;
}
