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
import { ContactsService } from '../../application/contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('emergency-contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

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
    @Body() dto: CreateContactDto,
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
