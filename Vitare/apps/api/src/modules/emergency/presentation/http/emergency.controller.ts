import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as currentUserDecorator from '../../../../common/decorators/current-user.decorator';
import { TriggerEmergencyDto } from './dto/trigger-emergency.dto';
import { EmergencyService } from '../../application/emergency.service';
import { MissingIdempotencyKeyError } from '../../../../common/errors/domain-error';

@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  /**
   * Contrato de acionamento: a chave de idempotência é OBRIGATÓRIA
   * (header `x-idempotency-key`). A fronteira HTTP rejeita ausência/branco com
   * 400 IDEMPOTENCY_KEY_REQUIRED; o use case valida o formato
   * (400 IDEMPOTENCY_KEY_INVALID). Retries offline DEVEM reutilizar a mesma
   * chave enfileirada no outbox do PWA.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('trigger')
  async trigger(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Body() dto: TriggerEmergencyDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length === 0
    ) {
      throw new MissingIdempotencyKeyError();
    }

    const result = await this.emergencyService.trigger(
      user.id,
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        patientSnapshot: dto.patientSnapshot,
        clientTriggeredAt: dto.clientTriggeredAt,
      },
      idempotencyKey,
    );

    return {
      ...result.event,
      idempotentReplay: result.replay,
    };
  }

  @Get()
  findAll(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const options: {
      cursor?: string;
      take?: number;
      orderBy?: { createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
    } = {};
    if (cursor) options.cursor = cursor;
    if (take) options.take = parseInt(take, 10);
    if (orderBy) {
      // simple parsing: "createdAt:asc,id:asc"
      const parts = orderBy.split(',').reduce(
        (acc, p) => {
          const [field, dir] = p.split(':');
          if (field === 'createdAt') acc.createdAt = dir as 'asc' | 'desc';
          if (field === 'id') acc.id = dir as 'asc' | 'desc';
          return acc;
        },
        {} as { createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' },
      );
      options.orderBy = parts;
    }
    return this.emergencyService.findManyByUser(user.id, options);
  }
}
