import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../../common/decorators/public.decorator';

function makeContext(isPublic: boolean) {
  const reflector = {
    getAllAndOverride: jest.fn((_key: string, targets: unknown[]) => {
      void targets;
      return _key === IS_PUBLIC_KEY ? isPublic : undefined;
    }),
  } as unknown as Reflector;

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as never;

  return { guard: new JwtAuthGuard(reflector), context };
}

describe('JwtAuthGuard', () => {
  it('permite rota marcada como pública sem token', () => {
    const { guard, context } = makeContext(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('delega ao passport-jwt quando a rota não é pública', () => {
    const { guard, context } = makeContext(false);
    const canActivateSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(canActivateSpy).toHaveBeenCalled();
    canActivateSpy.mockRestore();
  });
});
