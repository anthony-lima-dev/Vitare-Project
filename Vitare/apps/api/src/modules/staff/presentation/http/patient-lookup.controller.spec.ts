import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientLookupController } from './patient-lookup.controller';
import type { Request } from 'express';
import { LookupPatientUseCase } from '../../application/lookup-patient.use-case';

type StaffRequest = Request & { user: { id: string; role?: string } };

const STAFF_REQ = {
  user: { id: 's-1', role: 'MEDICO_SOCORRISTA' },
} as unknown as StaffRequest;

describe('PatientLookupController', () => {
  let controller: PatientLookupController;
  const mockLookupUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientLookupController],
      providers: [
        { provide: LookupPatientUseCase, useValue: mockLookupUseCase },
      ],
    }).compile();

    controller = module.get<PatientLookupController>(PatientLookupController);
  });

  it('404 quando nenhum paciente corresponde ao CPF', async () => {
    mockLookupUseCase.execute.mockRejectedValueOnce(
      new NotFoundException('Nenhum paciente encontrado com este CPF'),
    );
    await expect(
      controller.lookup(STAFF_REQ, { cpf: '12345678901' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('retorna o perfil agregado para CPF existente', async () => {
    mockLookupUseCase.execute.mockResolvedValueOnce({
      patient: { fullName: 'Ana' },
    });
    const result = await controller.lookup(STAFF_REQ, {
      cpf: '12345678901',
    });
    expect(result.patient.fullName).toBe('Ana');
    expect(mockLookupUseCase.execute).toHaveBeenCalledWith(
      { id: 's-1', role: 'MEDICO_SOCORRISTA' },
      '12345678901',
    );
  });
});
