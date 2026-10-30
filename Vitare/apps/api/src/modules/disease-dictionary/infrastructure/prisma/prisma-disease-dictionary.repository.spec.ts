import { PrismaDiseaseDictionaryRepository } from './prisma-disease-dictionary.repository';

describe('PrismaDiseaseDictionaryRepository (Cache-Aside)', () => {
  function makeDeps() {
    const prisma = {
      diseaseDictionary: { findMany: jest.fn(), findUnique: jest.fn() },
      diseaseGroup: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const redis = {
      key: (...parts: string[]) => ['vitare:test', ...parts].join(':'),
      getJson: jest.fn(),
      setJson: jest.fn().mockResolvedValue(true),
    };
    const repo = new PrismaDiseaseDictionaryRepository(
      prisma as never,
      redis as never,
    );
    return { repo, prisma, redis };
  }

  it('cache-miss → consulta PostgreSQL e popula o cache com TTL de 24h', async () => {
    const { repo, prisma, redis } = makeDeps();
    redis.getJson.mockResolvedValue(null); // miss em search e em groups
    prisma.diseaseDictionary.findMany.mockResolvedValueOnce([
      { id: 'd-1', code: 'E110', name: 'Diabetes' },
    ]);

    const result = await repo.search('diabetes');

    expect(prisma.diseaseDictionary.findMany).toHaveBeenCalledTimes(1);
    expect(redis.setJson).toHaveBeenCalledWith(
      'vitare:test:v1:disease-dictionary:search:diabetes',
      expect.any(Array),
      86_400,
    );
    expect(result).toHaveLength(1);
  });

  it('cache-hit → NÃO consulta o PostgreSQL', async () => {
    const { repo, prisma, redis } = makeDeps();
    redis.getJson.mockResolvedValueOnce([
      { id: 'd-1', code: 'E110', name: 'Diabetes', groupName: null },
    ]);

    const result = await repo.search('diabetes');

    expect(prisma.diseaseDictionary.findMany).not.toHaveBeenCalled();
    expect(result[0].name).toBe('Diabetes');
  });

  it('Redis indisponível → fallback seguro ao PostgreSQL', async () => {
    const { repo, prisma, redis } = makeDeps();
    // O adaptador Redis real engole falhas de conexão retornando null;
    // o repositório precisa seguir ao PostgreSQL sem estourar erro.
    redis.getJson.mockResolvedValue(null);
    redis.setJson.mockResolvedValue(false);
    prisma.diseaseDictionary.findMany.mockResolvedValueOnce([]);
    prisma.diseaseGroup.findMany.mockResolvedValueOnce([]);

    await expect(repo.search('got')).resolves.toEqual([]);
    expect(prisma.diseaseDictionary.findMany).toHaveBeenCalled();
  });
});
