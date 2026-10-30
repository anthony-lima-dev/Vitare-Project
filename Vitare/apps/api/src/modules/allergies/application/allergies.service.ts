import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAllergyDto } from '../presentation/http/dto/create-allergy.dto';
import { AllergiesRepository } from '../domain/repositories/allergies.repository';

@Injectable()
export class AllergiesService {
  constructor(private readonly repository: AllergiesRepository) {}

  findAllByUser(userId: string) {
    return this.repository.findAllByUser(userId);
  }

  create(userId: string, dto: CreateAllergyDto) {
    return this.repository.create(userId, dto);
  }

  async remove(id: string, userId: string) {
    const allergy = await this.repository.findById(id);
    if (!allergy) throw new NotFoundException('Alergia não encontrada');
    if (allergy.userId !== userId) throw new ForbiddenException();
    await this.repository.remove(id);
  }
}
