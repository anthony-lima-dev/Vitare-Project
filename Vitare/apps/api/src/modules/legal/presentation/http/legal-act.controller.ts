import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import * as currentUserDecorator from '../../../../common/decorators/current-user.decorator';
import { LegalActService } from '../../application/legal-act.service';
import { RecordLegalActDto } from './dto/record-legal-act.dto';
import { LegalActResponseDto } from './dto/legal-act-response.dto';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';

@Controller('legal-acts')
@UseGuards(JwtAuthGuard)
export class LegalActController {
  constructor(private readonly service: LegalActService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async record(
    @Body() dto: RecordLegalActDto,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    // O ator é o usuário autenticado; holder pode ser diferente (ex. responsável legal)
    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const record = await this.service.recordLegalAct({
      actorId: user.id,
      actorRole: 'USER',
      holderId: dto.holderId,
      actType: dto.actType,
      documentVersion: dto.documentVersion,
      contentHash: dto.contentHash,
      purpose: dto.purpose,
      legalBasis: dto.legalBasis,
      origin: dto.origin,
      ipHash: dto.ipHash ?? null,
    });

    return new LegalActResponseDto(record);
  }

  @Get('holder/:holderId')
  async findByHolder(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Query('actType') actType?: string,
    @Query('documentVersion') documentVersion?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Acesso restrito: apenas o próprio titular pode consultar seus próprios registros
    if (holderId !== user.id) {
      throw new ForbiddenException('Acesso restrito ao próprio titular');
    }

    return this.service.findByHolder(holderId, {
      actType: actType as any,
      documentVersion,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('actor/:actorId')
  async findByActor(
    @Param('actorId', ParseUUIDPipe) actorId: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    // Apenas o próprio ator pode consultar seus próprios registros
    if (actorId !== user.id) {
      throw new ForbiddenException('Acesso restrito ao próprio ator');
    }

    return this.service.findByActor(actorId);
  }
}
