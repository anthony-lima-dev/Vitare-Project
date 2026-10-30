import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConditionDto } from '../presentation/http/dto/create-condition.dto';
import {
  ConditionsRepository,
  ConditionWithDisease,
} from '../domain/repositories/conditions.repository';

@Injectable()
export class ConditionsService {
  constructor(private readonly repository: ConditionsRepository) {}

  findAllByUser(userId: string) {
    return this.repository.findAllActiveByUser(userId);
  }

  create(userId: string, dto: CreateConditionDto) {
    return this.repository.create(userId, dto.diseaseId, {
      notes: dto.notes,
      diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
    });
  }

  async softDelete(id: string, userId: string) {
    await this.getOwnedOrThrow(id, userId);
    await this.repository.softDelete(id);
  }

  private async getOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<ConditionWithDisease> {
    const condition = await this.repository.findById(id);
    if (!condition) throw new NotFoundException('Condição não encontrada');
    if (condition.userId !== userId) throw new ForbiddenException();
    return condition;
  }
}
