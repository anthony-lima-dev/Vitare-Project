import {
  assertAllowedTransition,
  EmergencyStatus,
  isFinalStatus,
} from './emergency-status';
import { InvalidEmergencyTransitionError } from '../../../common/errors/domain-error';

describe('Máquina de estados da emergência', () => {
  it.each([
    [EmergencyStatus.TRIGGERED, EmergencyStatus.NOTIFIED],
    [EmergencyStatus.TRIGGERED, EmergencyStatus.ACCEPTED],
    [EmergencyStatus.NOTIFIED, EmergencyStatus.ACCEPTED],
    [EmergencyStatus.ACCEPTED, EmergencyStatus.RESOLVED],
    [EmergencyStatus.TRIGGERED, EmergencyStatus.RESOLVED],
  ])('permite %s → %s', (from, to) => {
    expect(() => assertAllowedTransition(from, to)).not.toThrow();
  });

  it.each([
    [EmergencyStatus.RESOLVED, EmergencyStatus.ACCEPTED],
    [EmergencyStatus.ACCEPTED, EmergencyStatus.TRIGGERED],
    [EmergencyStatus.ACCEPTED, EmergencyStatus.NOTIFIED],
    [EmergencyStatus.RESOLVED, EmergencyStatus.TRIGGERED],
  ])('rejeita %s → %s', (from, to) => {
    expect(() => assertAllowedTransition(from, to)).toThrow(
      InvalidEmergencyTransitionError,
    );
  });

  it('RESOLVED é estado final', () => {
    expect(isFinalStatus(EmergencyStatus.RESOLVED)).toBe(true);
    expect(isFinalStatus(EmergencyStatus.TRIGGERED)).toBe(false);
  });
});
