import {
  CLINICAL_SNAPSHOT_VERSION,
  buildClientOriginSnapshot,
  buildServerSnapshot,
  type SnapshotSource,
} from './clinical-snapshot';

const RECEIVED_AT = new Date('2026-10-16T12:00:00.000Z');

function clientPayload(): Record<string, unknown> {
  return {
    snapshotVersion: '1.1',
    origin: 'server',
    capturedAt: '2026-10-16T11:59:00.000Z',
    serverReceivedAt: '2000-01-01T00:00:00.000Z',
    patient: {
      fullName: 'Maria Souza',
      cpf: '11122233344',
      bloodType: 'O+',
      birthDate: '1990-05-10',
      weightKg: 70,
      heightCm: 170,
      evilField: 'DROP ME',
    },
    conditions: [{ name: 'Diabetes', code: 'E11' }],
    medications: [
      { name: 'Metformina', dosage: '500mg', frequency: '2x ao dia' },
    ],
    contacts: [{ name: 'João', phone: '11999999999', isPrimary: true }],
    allergies: [{ name: 'Dipirona', severity: 'Alta', notes: 'urticária' }],
    unknownSection: { hack: true },
  };
}

/**
 * Finding 5.2 — parsing por allowlist: campos desconhecidos não podem ser
 * persistidos; metadados controlados pelo servidor (origin, serverReceivedAt)
 * nunca vêm do cliente; listas têm limite de itens e tipos validados.
 */
describe('buildClientOriginSnapshot (sanitização por allowlist)', () => {
  it('força a origem como client e o serverReceivedAt do servidor', () => {
    const result = buildClientOriginSnapshot(
      clientPayload(),
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;

    expect(result.origin).toBe('client');
    expect(result.serverReceivedAt).toBe(RECEIVED_AT.toISOString());
  });

  it('descarta seções e campos desconhecidos (allowlist)', () => {
    const result = buildClientOriginSnapshot(
      clientPayload(),
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;

    expect(result.unknownSection).toBeUndefined();
    const patient = result.patient as Record<string, unknown>;
    expect(patient.evilField).toBeUndefined();
    expect(patient.fullName).toBe('Maria Souza');
    expect(patient.cpf).toBe('11122233344');
  });

  it('mantém capturedAt válido do cliente', () => {
    const result = buildClientOriginSnapshot(
      clientPayload(),
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    expect(result.capturedAt).toBe('2026-10-16T11:59:00.000Z');
  });

  it('usa o horário do servidor quando capturedAt é inválido', () => {
    const payload = clientPayload();
    payload.capturedAt = 'not-a-date';
    const result = buildClientOriginSnapshot(
      payload,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    expect(result.capturedAt).toBe(RECEIVED_AT.toISOString());
  });

  it('usa a versão corrente quando snapshotVersion tem tipo inválido', () => {
    const payload = clientPayload();
    payload.snapshotVersion = 999;
    const result = buildClientOriginSnapshot(
      payload,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    expect(result.snapshotVersion).toBe(CLINICAL_SNAPSHOT_VERSION);
  });

  it('limita o número de itens por seção (caps)', () => {
    const payload = clientPayload();
    payload.conditions = Array.from({ length: 1000 }, (_, i) => ({
      name: `Doença ${i}`,
      code: `C${i}`,
    }));
    const result = buildClientOriginSnapshot(
      payload,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const conditions = result.conditions as unknown[];

    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.length).toBeLessThan(1000);
  });

  it('descarta itens malformados de listas sem propagar valores crus', () => {
    const payload = clientPayload();
    payload.conditions = [
      'nope',
      { name: 'Hipertensão', code: 'I10' },
      { name: 42, code: 7 },
      null,
    ];
    const result = buildClientOriginSnapshot(
      payload,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('nope');
    const conditions = result.conditions as Array<Record<string, unknown>>;
    for (const condition of conditions) {
      expect(typeof condition.name).toBe('string');
      expect(typeof condition.code).toBe('string');
    }
  });

  it('maneja objeto patient malformado sem propagar o valor cru', () => {
    const payload = clientPayload();
    payload.patient = 'evil-string';
    const result = buildClientOriginSnapshot(
      payload,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const patient = result.patient as Record<string, unknown>;

    expect(typeof result.patient).toBe('object');
    expect(typeof patient.fullName).toBe('string');
  });

  it('mantém medicamentos com o campo frequency (nunca schedules)', () => {
    const result = buildClientOriginSnapshot(
      clientPayload(),
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const medications = result.medications as Array<Record<string, unknown>>;

    expect(medications[0].frequency).toBe('2x ao dia');
    expect(medications[0]).not.toHaveProperty('schedules');
  });
});

describe('buildServerSnapshot (fonte autoritativa)', () => {
  const source: SnapshotSource = {
    fullName: 'Maria Souza',
    cpf: '11122233344',
    bloodType: 'O+',
    birthDate: new Date('1990-05-10'),
    weightKg: 70,
    heightCm: 170,
    conditions: [{ notes: null, disease: { name: 'Diabetes', code: 'E11' } }],
    medications: [
      { name: 'Metformina', dosage: '500mg', frequency: '2x ao dia' },
    ],
    contacts: [{ name: 'João', phone: '11999999999', isPrimary: true }],
    allergies: [{ name: 'Dipirona', severity: 'Alta', notes: null }],
  };

  it('constrói snapshot de origem server com os dados persistidos', () => {
    const result = buildServerSnapshot(
      source,
      undefined,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;

    expect(result.origin).toBe('server');
    expect(result.serverReceivedAt).toBe(RECEIVED_AT.toISOString());
    const patient = result.patient as Record<string, unknown>;
    expect(patient.fullName).toBe('Maria Souza');
    expect(result.snapshotVersion).toBe(CLINICAL_SNAPSHOT_VERSION);
  });

  it('normaliza weightKg de tipo inesperado para número ou null', () => {
    const weird = { ...source, weightKg: '70.5' } as SnapshotSource;
    const result = buildServerSnapshot(
      weird,
      undefined,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const patient = result.patient as Record<string, unknown>;

    expect(patient.weightKg === 70.5 || patient.weightKg === null).toBe(true);
  });

  it('inclui clientTriggeredAt nos metadados de sync quando fornecido', () => {
    const result = buildServerSnapshot(
      source,
      '2026-10-16T11:58:00.000Z',
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const sync = result.sync as Record<string, unknown>;

    expect(sync.clientTriggeredAt).toBe('2026-10-16T11:58:00.000Z');
  });

  it('omite metadados de sync quando não há clientTriggeredAt', () => {
    const result = buildServerSnapshot(
      source,
      undefined,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    expect(result.sync).toBeUndefined();
  });

  it('mapeia frequência de medicamentos (contrato sem schedules)', () => {
    const result = buildServerSnapshot(
      source,
      undefined,
      RECEIVED_AT,
    ) as unknown as Record<string, unknown>;
    const medications = result.medications as Array<Record<string, unknown>>;

    expect(medications[0].frequency).toBe('2x ao dia');
    expect(medications[0]).not.toHaveProperty('schedules');
  });
});
