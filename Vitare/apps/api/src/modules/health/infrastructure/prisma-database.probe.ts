import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { DatabaseProbePort } from '../application/ports/health-probes.port';

@Injectable()
export class PrismaDatabaseProbe implements DatabaseProbePort {
  constructor(private readonly prisma: PrismaService) {}

  ping(): Promise<unknown> {
    return this.prisma.$queryRaw`SELECT 1`;
  }
}
