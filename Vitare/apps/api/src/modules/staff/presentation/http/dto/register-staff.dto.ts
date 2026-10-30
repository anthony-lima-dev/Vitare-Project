import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsFlexiblePassword } from '../../../../../common/decorators/is-flexible-password.decorator';
import { LegalActAcceptanceDto } from '../../../../../../src/modules/legal/presentation/http/dto/legal-act-acceptance.dto';

export enum StaffRole {
  MEDICO_SOCORRISTA = 'MEDICO_SOCORRISTA',
  ENFERMEIRO_SOCORRISTA = 'ENFERMEIRO_SOCORRISTA',
  TECNICO_ENFERMAGEM = 'TECNICO_ENFERMAGEM',
  OPERADOR_TACTICAL = 'OPERADOR_TACTICAL',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
}

export class RegisterStaffDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'O CPF deve conter exatamente 11 dígitos numéricos.',
  })
  cpf!: string;

  @IsString()
  @IsNotEmpty({ message: 'O registro profissional é obrigatório.' })
  registrationNumber!: string;

  @IsEnum(StaffRole, { message: 'Selecione uma função válida.' })
  role!: StaffRole;

  // Política flexível: mínimo 8 caracteres e ao menos 2 de 4 critérios de
  // complexidade (minúscula, maiúscula, dígito, caractere especial).
  @IsFlexiblePassword()
  @MaxLength(72)
  password!: string;

  /**
   * Aceites de onboarding (Termos de Uso e Aviso de Privacidade, versão vigente).
   * Obrigatório: sem aceite válido de todos os documentos exigidos, o profissional
   * não é criado (validação transacional com a criação da conta).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalActAcceptanceDto)
  legalActs?: LegalActAcceptanceDto[];
}
