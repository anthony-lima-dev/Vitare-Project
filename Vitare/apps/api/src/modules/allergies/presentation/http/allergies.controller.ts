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
import { AllergiesService } from '../../application/allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';

@Controller('allergies')
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

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
    @Body() dto: CreateAllergyDto,
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
