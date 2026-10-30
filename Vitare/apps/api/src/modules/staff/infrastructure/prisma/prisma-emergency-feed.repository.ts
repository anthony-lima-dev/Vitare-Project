import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  EmergencyFeedRepository,
  StaffEmergencyFeedItem,
} from '../../domain/repositories/emergency-feed.repository';

/**
 * Consulta do feed operacional. A projeção seleciona APENAS colunas
 * operacionais + identidade basica (nome/CPF) — o snapshot clinico nao
 * e lido nem devolvido (least privilege / privacidade por default).
 *
 * Nome e CPF sao armazenados cifrados (T-08) e sao decifrados somente aqui
 * para montar a vista operacional destinada ao profissional de plantao.
 */
@Injectable()
export class PrismaEmergencyFeedRepository implements EmergencyFeedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findRecent(limit: number): Promise<StaffEmergencyFeedItem[]> {
    const events = await this.prisma.emergencyEvent.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      select: {
        id: true,
        triggeredAt: true,
        status: true,
        latitude: true,
        longitude: true,
        assignedStaffId: true,
        acceptedAt: true,
        resolvedAt: true,
        user: { select: { fullNameEnc: true, cpfEnc: true } },
      },
    });

    return events.map((event) => {
      const decrypt = (value: string | null): string | null =>
        value ? this.pii.decrypt(value) : null;

      return {
        id: event.id,
        triggeredAt: event.triggeredAt,
        status: event.status,
        latitude: event.latitude === null ? null : Number(event.latitude),
        longitude: event.longitude === null ? null : Number(event.longitude),
        assignedStaffId: event.assignedStaffId,
        acceptedAt: event.acceptedAt,
        resolvedAt: event.resolvedAt,
        patient: {
          fullName: decrypt(event.user.fullNameEnc) ?? '',
          cpf: decrypt(event.user.cpfEnc) ?? null,
        },
      };
    });
  }
}
