import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../../../common/decorators/public.decorator';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { AcceptEmergencyUseCase } from '../../../emergency/application/accept-emergency.use-case';
import { ResolveEmergencyUseCase } from '../../../emergency/application/resolve-emergency.use-case';
import { GetEmergencyFeedUseCase } from '../../application/get-emergency-feed.use-case';
import { UpdateStaffLocationUseCase } from '../../application/update-staff-location.use-case';
import { UpdateStaffLocationDto } from './dto/update-staff-location.dto';

interface StaffRequest extends Request {
  user: { id: string; role?: string };
}

/**
 * Controlador OPERACIONAL do módulo staff — apenas delega aos use cases.
 * Regras de negócio, persistência e índice geoespacial vivem na aplicação.
 */
@Controller('staff/emergencies')
export class EmergencyFeedController {
  constructor(
    private readonly feedUseCase: GetEmergencyFeedUseCase,
    private readonly acceptUseCase: AcceptEmergencyUseCase,
    private readonly resolveUseCase: ResolveEmergencyUseCase,
    private readonly locationUseCase: UpdateStaffLocationUseCase,
  ) {}

  @Public() // desliga o guard global de paciente; o guard de staff assume
  @UseGuards(StaffJwtAuthGuard)
  @Get()
  findRecent(@Query('limit') limit?: string) {
    return this.feedUseCase.execute(limit ? Number(limit) : undefined);
  }

  /**
   * Aceitação exclusiva: transição condicional atômica — se dois
   * profissionais tentarem assumir ao mesmo tempo, apenas um vence e o
   * outro recebe 409. Snapshot clínico permanece restrito à consulta
   * HTTP protegida (não trafega em broadcast).
   */
  @Public()
  @UseGuards(StaffJwtAuthGuard)
  @Post(':id/accept')
  accept(@Param('id', ParseUUIDPipe) id: string, @Req() req: StaffRequest) {
    return this.acceptUseCase.execute(id, req.user.id);
  }

  /** Encerramento: somente o profissional atribuído (validação no use case). */
  @Public()
  @UseGuards(StaffJwtAuthGuard)
  @Post(':id/resolve')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Req() req: StaffRequest) {
    return this.resolveUseCase.execute(id, req.user.id);
  }

  /** Membro do índice geoespacial = profissional AUTENTICADO (nunca do body). */
  @Public()
  @UseGuards(StaffJwtAuthGuard)
  @Post('location')
  updateLocation(
    @Req() req: StaffRequest,
    @Body() dto: UpdateStaffLocationDto,
  ) {
    return this.locationUseCase.execute(
      req.user.id,
      dto.latitude,
      dto.longitude,
    );
  }
}
