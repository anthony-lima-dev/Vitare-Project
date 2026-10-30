import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateContactDto } from '../presentation/http/dto/create-contact.dto';
import { ContactsRepository } from '../domain/repositories/contacts.repository';

@Injectable()
export class ContactsService {
  constructor(private readonly repository: ContactsRepository) {}

  findAllByUser(userId: string) {
    return this.repository.findAllByUser(userId);
  }

  create(userId: string, dto: CreateContactDto) {
    return this.repository.create(userId, dto);
  }

  async remove(id: string, userId: string) {
    const contact = await this.repository.findById(id);
    if (!contact) throw new NotFoundException('Contato não encontrado');
    if (contact.userId !== userId) throw new ForbiddenException();
    await this.repository.remove(id);
  }
}
