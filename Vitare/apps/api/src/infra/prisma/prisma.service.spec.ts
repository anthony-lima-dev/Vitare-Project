import { PrismaService } from './prisma.service';

/**
 * Instancia apenas a classe (sem onModuleInit) — o construtor cria o adaptador
 * sem abrir conexão. Testes de query real exigem fixture de banco (integração).
 */
describe('PrismaService', () => {
  it('should be defined without opening a connection', () => {
    process.env.POOLED_DATABASE_URL =
      process.env.POOLED_DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/vitare_test';
    expect(new PrismaService()).toBeDefined();
  });
});
