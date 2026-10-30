import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import * as currentUserDecorator from '../../../../common/decorators/current-user.decorator';
import { PatientsService } from '../../application/patients.service';
import { UpdatePatientDto } from './dto/update-patients.dto';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get('me')
  getProfile(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
  ) {
    return this.service.getProfile(user.id);
  }

  @Put('me')
  updateProfile(
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.AuthenticatedUser,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.service.updateProfile(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() user: currentUserDecorator.AuthenticatedUser) {
    return this.service.deleteAccount(user.id);
  }
}
