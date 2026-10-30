import { Module } from '@nestjs/common';
import { ContactsController } from './presentation/http/contacts.controller';
import { ContactsService } from './application/contacts.service';
import { ContactsRepository } from './domain/repositories/contacts.repository';
import { PrismaContactsRepository } from './infrastructure/prisma/prisma-contacts.repository';

@Module({
  controllers: [ContactsController],
  providers: [
    ContactsService,
    { provide: ContactsRepository, useClass: PrismaContactsRepository },
  ],
})
export class ContactsModule {}
