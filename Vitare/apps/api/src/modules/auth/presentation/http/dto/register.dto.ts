import {
  IsArray,
  IsEmail,
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

/**
 * Domínios de e-mail aceitos no cadastro por credenciais. O Gmail é
 * deliberadamente excluído: contas @gmail.com devem se cadastrar via
 * "Entrar com Google" (OAuth), evitando que o mesmo endereço exista
 * simultaneamente como conta local e como conta federada — cenário que
 * o AuthService não reconcilia automaticamente por design de segurança.
 */
const ALLOWED_EMAIL_DOMAINS = [
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
];

const EMAIL_DOMAIN_PATTERN = new RegExp(
  `^[^\\s@]+@(${ALLOWED_EMAIL_DOMAINS.map((d) => d.replace('.', '\\.')).join('|')})$`,
  'i',
);

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  @Matches(EMAIL_DOMAIN_PATTERN, {
    message: `Use um e-mail de um destes provedores: ${ALLOWED_EMAIL_DOMAINS.join(', ')}. Contas Gmail devem entrar com "Continuar com Google".`,
  })
  email!: string;

  // Política flexível: mínimo 8 caracteres e ao menos 2 de 4 critérios de
  // complexidade (minúscula, maiúscula, dígito, caractere especial).
  @IsFlexiblePassword()
  @MaxLength(72)
  password!: string;

  /**
   * Aceites de onboarding (Termos de Uso e Aviso de Privacidade, versão vigente).
   * Obrigatório: sem aceite válido de todos os documentos exigidos, a conta não
   * é criada (validação transacional com a criação da conta).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalActAcceptanceDto)
  legalActs?: LegalActAcceptanceDto[];
}
