import { IsString, Matches } from 'class-validator';

const CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

export class LookupPatientQueryDto {
  @IsString()
  @Matches(CPF_PATTERN, {
    message: 'CPF deve conter 11 dígitos, com ou sem máscara',
  })
  cpf!: string;
}
