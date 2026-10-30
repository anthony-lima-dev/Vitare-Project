import { InvalidEmergencyTransitionError } from '../../../common/errors/domain-error';

/**
 * Ciclo de vida do incidente de emergência.
 *
 * TRIGGERED → NOTIFIED  (dispatcher publicou o evento operacional)
 * TRIGGERED → ACCEPTED  (profissional assumiu o incidente)
 * NOTIFIED  → ACCEPTED
 * *         → RESOLVED  (encerramento; apenas de estados não-finais)
 *
 * O domínio não importa Prisma, NestJS ou Redis.
 */
export enum EmergencyStatus {
  TRIGGERED = 'TRIGGERED',
  NOTIFIED = 'NOTIFIED',
  ACCEPTED = 'ACCEPTED',
  RESOLVED = 'RESOLVED',
}

const ALLOWED_TRANSITIONS: Readonly<
  Record<EmergencyStatus, ReadonlySet<EmergencyStatus>>
> = {
  [EmergencyStatus.TRIGGERED]: new Set([
    EmergencyStatus.NOTIFIED,
    EmergencyStatus.ACCEPTED,
    EmergencyStatus.RESOLVED,
  ]),
  [EmergencyStatus.NOTIFIED]: new Set([
    EmergencyStatus.ACCEPTED,
    EmergencyStatus.RESOLVED,
  ]),
  [EmergencyStatus.ACCEPTED]: new Set([EmergencyStatus.RESOLVED]),
  [EmergencyStatus.RESOLVED]: new Set(),
};

export function assertAllowedTransition(
  from: EmergencyStatus,
  to: EmergencyStatus,
): void {
  if (from === to || !ALLOWED_TRANSITIONS[from].has(to)) {
    throw new InvalidEmergencyTransitionError(from, to);
  }
}

export function isFinalStatus(status: EmergencyStatus): boolean {
  return status === EmergencyStatus.RESOLVED;
}
