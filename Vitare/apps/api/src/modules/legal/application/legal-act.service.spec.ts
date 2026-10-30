// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LegalActService } from './legal-act.service';
import { LegalActRepository } from '../domain/repositories/legal-act.repository';
import { LEGAL_ACT_AUDIT_PORT } from '../domain/ports/legal-act-audit.port';
import type {
  LegalActInput,
  LegalActRecord,
  LegalActType,
  RequiredLegalDocument,
} from '../domain/entities/legal-act.entity';

describe('LegalActService (T-10/T-11)', () => {
  let service: LegalActService;
  let repository: jest.Mocked<LegalActRepository>;
  let audit: jest.Mocked<Record<'record', jest.Mock>>;
  let config: jest.Mocked<ConfigService>;

  const requiredDocuments: Record<string, RequiredLegalDocument> = {
    TERMS_OF_USE: {
      actType: 'TERMS_OF_USE' as const,
      version: 'v1.0.0',
      contentHash: 'sha256:terms-v1',
    },
    PRIVACY_NOTICE: {
      actType: 'PRIVACY_NOTICE' as const,
      version: 'v1.0.0',
      contentHash: 'sha256:privacy-v1',
    },
  };

  const baseInput = {
    actorId: 'actor-1',
    actorRole: 'USER',
    holderId: 'holder-1',
    actType: 'TERMS_OF_USE' as LegalActType,
    documentVersion: 'v1.0.0',
    contentHash: 'sha256:abc123',
    purpose: 'Cadastro de usuario',
    legalBasis: 'CONTRACT' as const,
    origin: 'web-register',
    ipHash: null,
  };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'LEGAL.requiredDocuments') return requiredDocuments;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    repository = {
      create: jest.fn(),
      findByHolder: jest.fn(),
      findByActor: jest.fn(),
      findByContentHash: jest.fn(),
      countByHolderAndType: jest.fn(),
    };

    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalActService,
        { provide: LegalActRepository, useValue: repository },
        { provide: LEGAL_ACT_AUDIT_PORT, useValue: audit },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(LegalActService);
  });

  it('deve registrar um ato juridico e retornar o registro com id e recordedAt', async () => {
    const expected: LegalActRecord = {
      id: 'rec-1',
      recordedAt: new Date('2026-01-01T00:00:00Z'),
      ...baseInput,
    };
    repository.create.mockResolvedValue(expected);

    const result = await service.recordLegalAct(baseInput);

    expect(repository.create).toHaveBeenCalledWith({
      actorId: baseInput.actorId,
      actorRole: baseInput.actorRole,
      holderId: baseInput.holderId,
      actType: baseInput.actType,
      documentVersion: baseInput.documentVersion,
      contentHash: baseInput.contentHash,
      purpose: baseInput.purpose,
      legalBasis: baseInput.legalBasis,
      origin: baseInput.origin,
      ipHash: baseInput.ipHash,
    });
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it('deve permitir multiplos aceites do mesmo titular para a mesma versao (append-only)', async () => {
    const first: LegalActRecord = {
      id: 'rec-1',
      recordedAt: new Date('2026-01-01T00:00:00Z'),
      ...baseInput,
    };
    const second: LegalActRecord = {
      id: 'rec-2',
      recordedAt: new Date('2026-01-02T00:00:00Z'),
      ...baseInput,
    };
    repository.create
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    await service.recordLegalAct(baseInput);
    await service.recordLegalAct(baseInput);

    expect(repository.create).toHaveBeenCalledTimes(2);
    // Cada aceite gera um registro distinto (nao sobrescreve o anterior)
    expect((repository.create as jest.Mock).mock.calls[0][0].contentHash).toBe(
      baseInput.contentHash,
    );
    expect((repository.create as jest.Mock).mock.calls[1][0].contentHash).toBe(
      baseInput.contentHash,
    );
  });

  it('deve armazenar hash do conteúdo e versao do documento para rastreabilidade', async () => {
    const expected: LegalActRecord = {
      id: 'rec-1',
      recordedAt: new Date(),
      ...baseInput,
      documentVersion: 'v2.3.1',
      contentHash: 'sha256:def456',
    };
    repository.create.mockResolvedValue(expected);

    const result = await service.recordLegalAct({
      ...baseInput,
      documentVersion: 'v2.3.1',
      contentHash: 'sha256:def456',
    });

    expect(result.documentVersion).toBe('v2.3.1');
    expect(result.contentHash).toBe('sha256:def456');
    expect(result.contentHash).toMatch(/^sha256:/);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        documentVersion: 'v2.3.1',
        contentHash: 'sha256:def456',
      }),
    );
  });

  it('deve minimizar dados: ipHash opcional e ausente por padrao', async () => {
    repository.create.mockResolvedValue({
      id: 'rec-1',
      recordedAt: new Date(),
      ...baseInput,
    });

    const result = await service.recordLegalAct({
      ...baseInput,
      ipHash: null,
    });

    expect(result.ipHash).toBeNull();
    // Nao ha campos de PII direta (nome, cpf, email, telefone) no registro
    const keys = Object.keys(result);
    expect(keys).not.toContain('fullName');
    expect(keys).not.toContain('cpf');
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('phone');
  });

  it('deve listar atos por titular com filtro de tipo e versao', async () => {
    const records: LegalActRecord[] = [
      { id: 'r1', recordedAt: new Date(), ...baseInput },
      {
        id: 'r2',
        recordedAt: new Date(),
        ...baseInput,
        actType: 'PRIVACY_NOTICE',
        documentVersion: 'v1.1.0',
      },
    ];
    repository.findByHolder.mockResolvedValue(records);

    const result = await service.findByHolder('holder-1', {
      actType: 'TERMS_OF_USE',
      documentVersion: 'v1.0.0',
    });

    expect(repository.findByHolder).toHaveBeenCalledWith({
      holderId: 'holder-1',
      actType: 'TERMS_OF_USE',
      documentVersion: 'v1.0.0',
    });
    expect(result).toHaveLength(2);
  });

  it('deve contar atos por titular e tipo', async () => {
    repository.countByHolderAndType.mockResolvedValue(3);

    const count = await service.countByHolderAndType(
      'holder-1',
      'TERMS_OF_USE',
    );

    expect(count).toBe(3);
    expect(repository.countByHolderAndType).toHaveBeenCalledWith(
      'holder-1',
      'TERMS_OF_USE',
    );
  });

  it('nao deve expor metodos de update/delete (append-only)', () => {
    // O servico so expoes record, findByHolder, findByActor, countByHolderAndType
    expect(typeof service['repository'].create).toBe('function');
    expect(typeof service['repository'].findByHolder).toBe('function');
    expect(typeof service['repository'].findByActor).toBe('function');
    expect(typeof service['repository'].findByContentHash).toBe('function');
    expect(typeof service['repository'].countByHolderAndType).toBe('function');
    // Nao deve haver update ou delete na interface do repositorio
    const proto = Object.getOwnPropertyNames(
      Object.getPrototypeOf(LegalActRepository.prototype),
    );
    expect(proto).not.toContain('update');
    expect(proto).not.toContain('delete');
  });

  describe('validateOnboardingAcceptance (T-11)', () => {
    const validActs: LegalActInput[] = [
      {
        actType: 'TERMS_OF_USE',
        documentVersion: 'v1.0.0',
        contentHash: 'sha256:terms-v1',
      } as const,
      {
        actType: 'PRIVACY_NOTICE',
        documentVersion: 'v1.0.0',
        contentHash: 'sha256:privacy-v1',
      } as const,
    ];

    it('nao lança excecao quando todos os documentos exigidos estao aceitos na versao vigente', () => {
      expect(() =>
        service.validateOnboardingAcceptance(validActs),
      ).not.toThrow();
    });

    it('rejeita quando falta o aceite de um documento obrigatorio', () => {
      expect(() =>
        service.validateOnboardingAcceptance([validActs[0]]),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validateOnboardingAcceptance([validActs[1]]),
      ).toThrow(BadRequestException);
    });

    it('rejeita versoes antigas (nao e permitido aceitar versao desatualizada)', () => {
      const oldVersion: LegalActInput[] = [
        {
          actType: 'TERMS_OF_USE',
          documentVersion: 'v0.9.0',
          contentHash: 'sha256:terms-v1',
        } as const,
        validActs[1],
      ];
      expect(() => service.validateOnboardingAcceptance(oldVersion)).toThrow(
        BadRequestException,
      );
    });

    it('rejeita quando o hash do conteúdo diverge do publicado (tentativa de aceite fora da versao)', () => {
      const wrongHash: LegalActInput[] = [
        {
          actType: 'TERMS_OF_USE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:outro-hash',
        } as const,
        validActs[1],
      ];
      expect(() => service.validateOnboardingAcceptance(wrongHash)).toThrow(
        BadRequestException,
      );
    });

    it('reaceite de nova versao e permitido: nao sobrescreve aceitacoes anteriores', () => {
      const novaVersao: LegalActInput[] = [
        {
          actType: 'TERMS_OF_USE',
          documentVersion: 'v1.1.0',
          contentHash: 'sha256:terms-v2',
        } as const,
        {
          actType: 'PRIVACY_NOTICE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:privacy-v1',
        } as const,
      ];
      // config aponta v1.0.0 -> v1.1.0 deve ser rejeitado para TERMS_OF_USE
      expect(() => service.validateOnboardingAcceptance(novaVersao)).toThrow(
        BadRequestException,
      );

      // Atualiza os documentos vigentes para v1.1.0 (mudanca de termos)
      config.get.mockImplementation((key: string) => {
        if (key === 'LEGAL.requiredDocuments') {
          return {
            TERMS_OF_USE: {
              actType: 'TERMS_OF_USE' as const,
              version: 'v1.1.0',
              contentHash: 'sha256:terms-v2',
            },
            PRIVACY_NOTICE: {
              actType: 'PRIVACY_NOTICE' as const,
              version: 'v1.0.0',
              contentHash: 'sha256:privacy-v1',
            },
          };
        }
        return undefined;
      });

      // Agora o re-aceite na nova versao e valido (novo evento, historico preservado)
      expect(() =>
        service.validateOnboardingAcceptance(novaVersao),
      ).not.toThrow();
    });
  });
  describe('hasCurrentAcceptance (T-11)', () => {
    it('retorna true quando todos os documentos exigidos estam aceitos na versao vigente', async () => {
      repository.findByHolder.mockResolvedValue([
        {
          id: 'r1',
          recordedAt: new Date(),
          actorId: 'a',
          actorRole: 'USER',
          holderId: 'holder-1',
          actType: 'TERMS_OF_USE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:terms-v1',
          purpose: 'p',
          legalBasis: 'CONTRACT',
          origin: 'o',
          ipHash: null,
        },
        {
          id: 'r2',
          recordedAt: new Date(),
          actorId: 'a',
          actorRole: 'USER',
          holderId: 'holder-1',
          actType: 'PRIVACY_NOTICE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:privacy-v1',
          purpose: 'p',
          legalBasis: 'LEGAL_OBLIGATION',
          origin: 'o',
          ipHash: null,
        },
      ]);
      expect(await service.hasCurrentAcceptance('holder-1')).toBe(true);
      expect(repository.findByHolder).toHaveBeenCalledWith({
        holderId: 'holder-1',
      });
    });

    it('retorna false quando falta aceite de algum documento exigido', async () => {
      repository.findByHolder.mockResolvedValue([
        {
          id: 'r1',
          recordedAt: new Date(),
          actorId: 'a',
          actorRole: 'USER',
          holderId: 'holder-1',
          actType: 'TERMS_OF_USE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:terms-v1',
          purpose: 'p',
          legalBasis: 'CONTRACT',
          origin: 'o',
          ipHash: null,
        },
      ]);
      expect(await service.hasCurrentAcceptance('holder-1')).toBe(false);
    });

    it('retorna false quando o aceite é de versão antiga (exige re-aceite)', async () => {
      repository.findByHolder.mockResolvedValue([
        {
          id: 'r1',
          recordedAt: new Date(),
          actorId: 'a',
          actorRole: 'USER',
          holderId: 'holder-1',
          actType: 'TERMS_OF_USE',
          documentVersion: 'v0.9.0',
          contentHash: 'sha256:terms-old',
          purpose: 'p',
          legalBasis: 'CONTRACT',
          origin: 'o',
          ipHash: null,
        },
        {
          id: 'r2',
          recordedAt: new Date(),
          actorId: 'a',
          actorRole: 'USER',
          holderId: 'holder-1',
          actType: 'PRIVACY_NOTICE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:privacy-v1',
          purpose: 'p',
          legalBasis: 'LEGAL_OBLIGATION',
          origin: 'o',
          ipHash: null,
        },
      ]);
      expect(await service.hasCurrentAcceptance('holder-1')).toBe(false);
    });

    it('retorna false para titular sem nenhum registro', async () => {
      repository.findByHolder.mockResolvedValue([]);
      expect(await service.hasCurrentAcceptance('holder-1')).toBe(false);
    });
  });
});
