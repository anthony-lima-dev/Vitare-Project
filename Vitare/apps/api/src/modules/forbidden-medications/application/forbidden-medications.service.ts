import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateForbiddenMedicationDto } from '../presentation/http/dto/create-forbidden-medication.dto';
import {
  ForbiddenMedicationsRepository,
  ForbiddenMedicationWithDetails,
} from '../domain/repositories/forbidden-medications.repository';

@Injectable()
export class ForbiddenMedicationsService {
  constructor(private readonly repository: ForbiddenMedicationsRepository) {}

  findAllByUser(userId: string) {
    return this.repository.findAllByUser(userId);
  }

  create(userId: string, dto: CreateForbiddenMedicationDto) {
    return this.repository.create(userId, dto);
  }

  async remove(id: string, userId: string) {
    await this.getOwnedOrThrow(id, userId);
    await this.repository.remove(id);
  }

  private async getOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<ForbiddenMedicationWithDetails> {
    const forbidden = await this.repository.findById(id);
    if (!forbidden) throw new NotFoundException('Registro não encontrado');
    if (forbidden.userId !== userId) throw new ForbiddenException();
    return forbidden;
  }
}
