import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LegalActService } from '../../legal/application/legal-act.service';
import { StaffMember } from '../domain/entities/staff-member.entity';
import type { LegalActInput } from '../../legal/domain/entities/legal-act.entity';
import { hashPassword, verifyPassword } from '../../../common/utils/hash.util';
import { StaffRepository } from '../domain/repositories/staff.repository';

export interface StaffProvisionContext {
  /** Chave de bootstrap (header X-Bootstrap-Key) — só vale a 1ª conta. */
  bootstrapKey?: string;
  /** Usuário de staff autenticado, se o token vier no request (opcional). */
  actor?: { id: string; role: string };
}

export enum AuthMethod {
  OAUTH_GOOGLE = 'OAUTH_GOOGLE',
  LOCAL = 'LOCAL',
}

export interface CheckRealmResult {
  email: string;
  authMethod: AuthMethod;
}

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly legalActService: LegalActService,
  ) {}

  /**
   * Verificação de realm puramente baseada em domínio (contas Google
   * nativas). O modelo Staff não possui vínculo OAuth — o antigo ramo
   * morto de googleId foi removido. Contas desconhecidas respondem LOCAL
   * para não revelar existência de e-mails (OWASP / CWE-204).
   */
  async checkRealm(email: string): Promise<CheckRealmResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split('@')[1]?.toLowerCase();

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return { email: normalizedEmail, authMethod: AuthMethod.OAUTH_GOOGLE };
    }

    return { email: normalizedEmail, authMethod: AuthMethod.LOCAL };
  }

  /**
   * Provisionamento controlado de contas de staff:
   *  - Sem staff cadastrado → exige STAFF_BOOTSTRAP_KEY e reivindica o
   *    slot de primeira conta ATOMICAMENTE (advisory lock + recontagem
   *    transacional): duas requisições concorrentes com a chave correta
   *    não criam duas contas.
   *  - Com staff existente → apenas ADMINISTRATIVO autenticado registra
   *    novos profissionais; visitante anônimo nunca autoatribui papéis.
   */
  async register(
    fullName: string,
    email: string,
    cpf: string,
    registrationNumber: string,
    role: string,
    password: string,
    context: StaffProvisionContext = {},
    legalActs: LegalActInput[] = [],
  ) {
    // O aceite de TODOS os documentos exigidos na versão vigente é
    // pré-requisito: qualquer falha ocorre ANTES de criar a conta.
    await this.legalActService.validateOnboardingAcceptance(legalActs);

    const staffCount = await this.staffRepository.count();

    if (staffCount === 0) {
      const expected = this.config.get<string>('STAFF_BOOTSTRAP_KEY');
      if (!expected || context.bootstrapKey !== expected) {
        throw new ForbiddenException(
          'Provisionamento inicial indisponível: chave de bootstrap ausente ou inválida.',
        );
      }

      const passwordHash = await hashPassword(password);
      const staff = await this.staffRepository.createFirstStaff({
        fullName,
        email,
        cpf,
        registrationNumber,
        role,
        passwordHash,
        legalActs,
      });

      if (!staff) {
        throw new ConflictException(
          'A conta inicial já foi provisionada por outra requisição.',
        );
      }

      return this.issueToken(staff);
    }

    if (!context.actor || context.actor.role !== 'ADMINISTRATIVO') {
      throw new ForbiddenException(
        'Apenas uma conta ADMINISTRATIVO pode registrar novos profissionais.',
      );
    }

    const existing = await this.staffRepository.findByEmail(email);
    if (existing) throw new UnauthorizedException('E-mail já cadastrado');

    const passwordHash = await hashPassword(password);
    const staff = await this.staffRepository.create({
      fullName,
      email,
      cpf,
      registrationNumber,
      role,
      passwordHash,
      legalActs,
    });
    return this.issueToken(staff);
  }

  async login(email: string, password: string) {
    const staff = await this.staffRepository.findByEmail(email);
    if (!staff) throw new UnauthorizedException('E-mail ou senha inválidos');
    if (!staff.passwordHash)
      throw new UnauthorizedException('E-mail ou senha inválidos');
    const isValid = await verifyPassword(password, staff.passwordHash);
    if (!isValid) throw new UnauthorizedException('E-mail ou senha inválidos');

    return this.issueToken(staff);
  }

  async me(id: string) {
    const staff = await this.staffRepository.findById(id);
    if (!staff) {
      throw new UnauthorizedException('Credencial de staff inválida');
    }

    return this.serializeStaff(staff);
  }

  /** Consulta pública: o monitoramento precisa saber se já pode autenticar. */
  async getSetupStatus(): Promise<{ setupRequired: boolean }> {
    return { setupRequired: (await this.staffRepository.count()) === 0 };
  }

  private issueToken(staff: StaffMember) {
    const staffData = this.serializeStaff(staff);
    const accessToken = this.jwtService.sign(
      { sub: staff.id, email: staff.email, type: 'staff' },
      {
        secret: this.config.get<string>('STAFF_JWT_SECRET'),
        expiresIn: this.config.get<string>(
          'STAFF_JWT_EXPIRES_IN',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    return {
      accessToken,
      staff: staffData,
    };
  }

  private serializeStaff(staff: StaffMember) {
    return {
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      cpf: staff.cpf,
      registrationNumber: staff.registrationNumber,
      role: staff.role,
    };
  }
}
