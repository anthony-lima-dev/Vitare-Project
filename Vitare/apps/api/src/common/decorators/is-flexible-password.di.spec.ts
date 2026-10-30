import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { useContainer, validate } from 'class-validator';
import {
  IsFlexiblePassword,
  IsFlexiblePasswordConstraint,
} from './is-flexible-password.decorator';

class DiFixtureDto {
  @IsFlexiblePassword()
  password!: string;
}

/**
 * Verifica a ponte `useContainer` ↔ `ConfigService`: a constraint do
 * class-validator deve ser resolvida pelo contêiner do Nest (e não pelo
 * fallback), recebendo o `ConfigService` injetado. Arquivo separado para
 * isolar o `useContainer` (estado global do class-validator) dos demais testes.
 */
describe('@IsFlexiblePassword (integração com o contêiner do Nest)', () => {
  it('injeta o ConfigService via useContainer e aplica os limites configurados', async () => {
    const values: Record<string, string> = {
      PASSWORD_MIN_LENGTH: '10',
      PASSWORD_MIN_RULES: '3',
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IsFlexiblePasswordConstraint,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => values[key] },
        },
      ],
    }).compile();

    expect(moduleRef.get(IsFlexiblePasswordConstraint)).toBeInstanceOf(
      IsFlexiblePasswordConstraint,
    );

    useContainer(moduleRef, { fallbackOnErrors: true });

    const tooWeak = new DiFixtureDto();
    tooWeak.password = 'abcd1234'; // 8 chars / 2 regras → viola a política 10/3
    const errors = await validate(tooWeak);

    expect(errors).toHaveLength(1);
    expect(Object.values(errors[0].constraints ?? {})[0]).toContain(
      '10 caracteres',
    );

    const compliant = new DiFixtureDto();
    compliant.password = 'abcd1234!!'; // 10 chars / 3 regras
    await expect(validate(compliant)).resolves.toEqual([]);
  });
});
