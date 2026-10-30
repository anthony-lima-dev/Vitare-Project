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
import { ConditionsService } from '../../application/conditions.service';
import { CreateConditionDto } from './dto/create-condition.dto';

@Controller('conditions')
export class ConditionsController {
  constructor(private readonly service: ConditionsService) {}

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
    @Body() dto: CreateConditionDto,
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
    return this.service.softDelete(id, user.id);
  }
}
