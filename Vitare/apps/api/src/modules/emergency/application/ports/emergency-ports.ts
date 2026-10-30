import {
  PatientSnapshot,
  SnapshotSource,
} from '../../domain/clinical-snapshot';
import { EmergencyStatus } from '../../domain/emergency-status';

/** Contratos de aplicação — não importam Prisma, NestJS nem Redis. */

export interface EmergencyEventRecord {
  id: string;
  userId: string;
  triggeredAt: Date;
  latitude: unknown;
  longitude: unknown;
  patientSnapshot: unknown;
  status: EmergencyStatus;
  notes: string | null;
  assignedStaffId: string | null;
  acceptedAt: Date | null;
  resolvedAt: Date | null;
}

export interface CreateEmergencyData {
  userId: string;
  latitude?: number;
  longitude?: number;
  patientSnapshot: PatientSnapshot;
}

export interface EmergencyTopublishPayload {
  id: string;
  status: EmergencyStatus;
  triggeredAt: string;
  assignedStaffId?: string | null;
}

export interface EmergencyRepositoryPort {
  /** Fonte do snapshot ANINHADA na transação de idempotência. */
  buildSnapshotSource(userId: string, tx?: unknown): Promise<SnapshotSource>;

  /** Cria o evento e grava o evento Outbox na mesma transação. */
  createEvent(
    data: CreateEmergencyData,
    tx?: unknown,
  ): Promise<EmergencyEventRecord>;

  /** Lê evento por id (para transições condicionais). */
  findById(id: string): Promise<EmergencyEventRecord | null>;

  /** Lista eventos do usuário com paginação por cursor e ordenação estável. */
  findManyByUser(
    userId: string,
    options?: {
      cursor?: string; // id do último item da página anterior
      take?: number; // quantidade máxima
      orderBy?: { triggeredAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
    },
  ): Promise<{ items: EmergencyEventRecord[]; nextCursor: string | null }>;

  /** Legado (sem paginação) – mantido para compatibilidade. */
  findAllByUser(userId: string): Promise<EmergencyEventRecord[]>;

  /**
   * Transição condicional atômica: retorna o registro atualizado ou null
   * quando o estado atual não permite a transição (concorrência segura).
   */
  transitionIfCurrent(
    id: string,
    from: EmergencyStatus[],
    to: EmergencyStatus,
    patch: Partial<Pick<EmergencyEventRecord, 'assignedStaffId'>>,
  ): Promise<EmergencyEventRecord | null>;

  /** Marca NOTIFIED sem produzir outro evento de Outbox. */
  markNotifiedIfCurrent(id: string): Promise<void>;
}

/** Outbox: gravação de evento operacional publicável. */
export interface OutboxPort {
  recordPending(
    type: string,
    payload: EmergencyTopublishPayload,
  ): Promise<void>;
}

export const EMERGENCY_REPOSITORY = Symbol('EMERGENCY_REPOSITORY');
export const OUTBOX_PORT = Symbol('OUTBOX_PORT');
