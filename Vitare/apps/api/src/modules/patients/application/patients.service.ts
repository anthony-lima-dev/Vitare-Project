/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeCpf } from '../../../common/utils/cpf.util';
import type { NumericValue } from '../../../common/domain/primitives';
import type { Patient } from '../domain/entities/patient.entity';
import { UpdatePatientDto } from '../presentation/http/dto/update-patients.dto';
import { PatientsRepository } from '../domain/repositories/patients.repository';
import { LegalActService } from '../../legal/application/legal-act.service';

function toNumericValue(value: number | undefined): NumericValue | undefined {
  // PATCH semantics: omitted values must not erase existing values.
  if (value === undefined) return undefined;
  return {
    toString: () => value.toString(),
    toNumber: () => value,
  };
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly repository: PatientsRepository,
    private readonly legalActService: LegalActService,
  ) {}

  private toPublicProfile(user: Patient) {
    const { passwordHash: _omit, weightKg, ...safe } = user;
    return { ...safe, weightKg: weightKg?.toNumber() ?? null };
  }

  async getProfile(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundException('Paciente não encontrado');
    return this.toPublicProfile(user);
  }

  async updateProfile(userId: string, dto: UpdatePatientDto) {
    const legalActs = dto.legalActs ?? [];

    // Quando há aceites na requisição, validam contra os documentos vigentes
    // e são gravados na mesma transação da ativação do perfil (primeiro acesso
    // ou re-aceite após mudança de termos).
    if (legalActs.length > 0) {
      this.legalActService.validateOnboardingAcceptance(legalActs);
      const updated = await this.repository.update(userId, {
        ...dto,
        legalActs,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        weightKg: toNumericValue(dto.weightKg),
        // CPF em formato canônico (11 dígitos) — mascarado apenas na exibição.
        cpf: dto.cpf ? normalizeCpf(dto.cpf) : undefined,
      });
      return this.toPublicProfile(updated);
    }

    // Sem aceites na requisição: o titular já deve ter aceito os documentos
    // vigentes; caso contrário, o avanço é bloqueado.
    const hasAccepted = await this.legalActService.hasCurrentAcceptance(userId);
    if (!hasAccepted) {
      throw new BadRequestException(
        'Aceite dos Termos de Uso e do Aviso de Privacidade (versão vigente) é obrigatório antes de concluir o cadastro.',
      );
    }

    const updated = await this.repository.update(userId, {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      weightKg: toNumericValue(dto.weightKg),
      // CPF em formato canônico (11 dígitos) — mascarado apenas na exibição.
      cpf: dto.cpf ? normalizeCpf(dto.cpf) : undefined,
    });
    return this.toPublicProfile(updated);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundException('Paciente não encontrado');
    await this.repository.remove(userId);
  }
}
