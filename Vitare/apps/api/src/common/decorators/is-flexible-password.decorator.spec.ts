import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import type { ValidationArguments } from 'class-validator';
import {
  IsFlexiblePassword,
  IsFlexiblePasswordConstraint,
} from './is-flexible-password.decorator';
import type { PasswordValidatorOptions } from '../utils/password-validator.util';

class RegisterFixtureDto {
  @IsFlexiblePassword()
  password!: string;
}

class StrictFixtureDto {
  @IsFlexiblePassword({ minLength: 12, minRules: 3 })
  password!: string;
}

const originalEnv = { ...process.env };

function buildArguments(
  options?: PasswordValidatorOptions,
): ValidationArguments {
  return {
    value: undefined,
    targetName: 'RegisterFixtureDto',
    object: {},
    property: 'password',
    constraints: [options],
  };
}

async function collectErrors(dto: object): Promise<string[]> {
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('@IsFlexiblePassword', () => {
  beforeAll(() => {
    delete process.env.PASSWORD_MIN_LENGTH;
    delete process.env.PASSWORD_MIN_RULES;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  describe('IsFlexiblePasswordConstraint (motor direto)', () => {
    const constraint = new IsFlexiblePasswordConstraint();
    const args = buildArguments();

    it('aprova apenas números e letras minúsculas (>= 8)', () => {
      expect(constraint.validate('abcd1234', args)).toBe(true);
    });

    it('aprova apenas números e caracteres especiais (>= 8)', () => {
      expect(constraint.validate('12345678!', args)).toBe(true);
    });

    it('reprova senha curta mesmo com alta complexidade', () => {
      expect(constraint.validate('Ab1!', args)).toBe(false);
      expect(constraint.validate('aB1!@', args)).toBe(false);
    });

    it('reprova senha longa com apenas 1 critério', () => {
      expect(constraint.validate('123456789012', args)).toBe(false);
      expect(constraint.validate('abcdefghijkl', args)).toBe(false);
    });

    it('reprova entradas vazias ou de tipo inválido', () => {
      expect(constraint.validate('', args)).toBe(false);
      expect(constraint.validate(undefined, args)).toBe(false);
      expect(constraint.validate(null, args)).toBe(false);
      expect(constraint.validate(12345678, args)).toBe(false);
      expect(constraint.validate({}, args)).toBe(false);
    });

    it('aplica opções explícitas propagadas via constraints', () => {
      const strictArgs = buildArguments({ minLength: 12, minRules: 3 });
      expect(constraint.validate('abcd1234', strictArgs)).toBe(false);
      expect(constraint.validate('abcd123456!!', strictArgs)).toBe(true);
    });

    it('usa o ConfigService quando injetado (minLength 10 / minRules 3)', () => {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'PASSWORD_MIN_LENGTH') return '10';
          if (key === 'PASSWORD_MIN_RULES') return '3';
          return undefined;
        }),
      } as unknown as ConfigService;
      const configured = new IsFlexiblePasswordConstraint(configService);

      expect(configured.validate('abcd1234', args)).toBe(false); // 8 < 10
      expect(configured.validate('abcd1234!!', args)).toBe(true); // 10 chars / 3 regras
    });

    it('reflete a política na mensagem de erro', () => {
      const defaultMessage = new IsFlexiblePasswordConstraint().defaultMessage(
        args,
      );
      expect(defaultMessage).toContain(
        'A senha não atende aos critérios mínimos',
      );
      expect(defaultMessage).toContain('8 caracteres');
      expect(defaultMessage).toContain('2 de 4');
    });
  });

  describe('validação de DTO (integração com class-validator)', () => {
    it('aprova apenas números e letras minúsculas (>= 8)', async () => {
      const dto = new RegisterFixtureDto();
      dto.password = 'abcd1234';
      await expect(collectErrors(dto)).resolves.toEqual([]);
    });

    it('aprova apenas números e caracteres especiais (>= 8)', async () => {
      const dto = new RegisterFixtureDto();
      dto.password = '12345678!';
      await expect(collectErrors(dto)).resolves.toEqual([]);
    });

    it('reprova senha curta, com mensagem explicativa', async () => {
      const dto = new RegisterFixtureDto();
      dto.password = 'Ab1!';
      const errors = await collectErrors(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('A senha não atende aos critérios mínimos');
    });

    it('reprova senha longa que atende a apenas 1 critério', async () => {
      const dto = new RegisterFixtureDto();
      dto.password = '123456789012';
      await expect(collectErrors(dto)).resolves.toHaveLength(1);
    });

    it('reprova string vazia e valor ausente', async () => {
      const empty = new RegisterFixtureDto();
      empty.password = '';
      await expect(collectErrors(empty)).resolves.toHaveLength(1);

      const missing = new RegisterFixtureDto();
      await expect(collectErrors(missing)).resolves.toHaveLength(1);
    });

    it('reprova valor que não é string', async () => {
      const dto = new RegisterFixtureDto();
      (dto as unknown as { password: number }).password = 12345678;
      await expect(collectErrors(dto)).resolves.toHaveLength(1);
    });

    it('respeita a política estrita definida no DTO', async () => {
      const weak = new StrictFixtureDto();
      weak.password = 'abcd1234';
      await expect(collectErrors(weak)).resolves.toHaveLength(1);

      const strong = new StrictFixtureDto();
      strong.password = 'abcd123456!!';
      await expect(collectErrors(strong)).resolves.toEqual([]);
    });
  });
});
