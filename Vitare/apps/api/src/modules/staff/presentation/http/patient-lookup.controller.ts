import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../../common/decorators/public.decorator';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { LookupPatientQueryDto } from './dto/lookup-patient-query.dto';
import { LookupPatientUseCase } from '../../application/lookup-patient.use-case';

interface StaffRequest extends Request {
  user: { id: string; role?: string };
}

/**
 * Consulta de prontuário completo por CPF — autorização por papel e
 * trilha de auditoria obrigatória vivem no use case (não aqui).
 */
@Controller('staff/patients')
export class PatientLookupController {
  constructor(private readonly lookupUseCase: LookupPatientUseCase) {}

  @Public()
  @UseGuards(StaffJwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get()
  lookup(@Req() req: StaffRequest, @Query() query: LookupPatientQueryDto) {
    return this.lookupUseCase.execute(
      { id: req.user.id, role: req.user.role ?? '' },
      query.cpf,
    );
  }
}
