import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import * as currentUserDecorator from '../../../../common/decorators/current-user.decorator';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { MedicationsService } from '../../application/medications.service';

@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get()
  findAll(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.medicationsService.findAllActiveByUser(user.id);
  }

  @Post()
  create(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medicationsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.medicationsService.softDelete(id, user.id);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.medicationsService.getHistory(id, user.id);
  }
}
