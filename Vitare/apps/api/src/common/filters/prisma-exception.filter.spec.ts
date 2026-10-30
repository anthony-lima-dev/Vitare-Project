import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  it('maps P2002 to 409 Conflict', () => {
    const { host, status } = makeHost();
    filter.catch(prismaError('P2002'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  it('maps P2025 to 404 Not Found', () => {
    const { host, status } = makeHost();
    filter.catch(prismaError('P2025'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('maps P2003 to 400 Bad Request', () => {
    const { host, status } = makeHost();
    filter.catch(prismaError('P2003'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('maps unknown codes to 500 without leaking internals', () => {
    const { host, status, json } = makeHost();
    filter.catch(prismaError('P2999'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro interno no acesso a dados' }),
    );
  });
});
