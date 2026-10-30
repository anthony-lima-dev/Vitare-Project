import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import * as currentUserDecorator from '../../../../common/decorators/current-user.decorator';
import { CreateForbiddenMedicationDto } from './dto/create-forbidden-medication.dto';
import { ForbiddenMedicationsService } from '../../application/forbidden-medications.service';

@Controller('forbidden-medications')
export class ForbiddenMedicationsController {
  constructor(private readonly service: ForbiddenMedicationsService) {}

  @Get()
  findAll(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.service.findAllByUser(user.id);
  }

  @Post()
  create(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Body() dto: CreateForbiddenMedicationDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.service.remove(id, user.id);
  }
}
