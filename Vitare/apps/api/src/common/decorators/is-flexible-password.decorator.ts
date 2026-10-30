import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { registerDecorator, ValidatorConstraint } from 'class-validator';
import type {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  buildPasswordPolicyMessage,
  isPasswordCompliant,
  PASSWORD_MIN_LENGTH_ENV_KEY,
  PASSWORD_MIN_RULES_ENV_KEY,
  readPasswordPolicyEnvironment,
  resolvePasswordValidatorOptions,
  type PasswordPolicyEnvironment,
  type PasswordValidatorOptions,
} from '../utils/password-validator.util';

/**
 * Motor do decorator `@IsFlexiblePassword`.
 *
 * Resolução da política, em ordem de prioridade:
 *   1. opções explícitas passadas no decorator (`minLength`/`minRules`);
 *   2. `ConfigService` (envs `PASSWORD_MIN_LENGTH` / `PASSWORD_MIN_RULES`);
 *   3. variáveis de ambiente cruas (`process.env`);
 *   4. fallbacks estáticos seguros (8 caracteres / 2 critérios).
 *
 * O `ConfigService` é injetado de forma OPCIONAL: quando o `class-validator` é
 * integrado ao contêiner do Nest via `useContainer` (ver `main.ts` e o registro
 * deste provider em `AppModule`), o Nest resolve a dependência; quando a
 * constraint é instanciada fora do contêiner (ex.: testes unitários), o
 * fallback de ambiente assume o controle sem quebrar a validação.
 */
@ValidatorConstraint({ name: 'isFlexiblePassword', async: false })
@Injectable()
export class IsFlexiblePasswordConstraint implements ValidatorConstraintInterface {
  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  validate(value: unknown, args: ValidationArguments): boolean {
    return isPasswordCompliant(
      value,
      IsFlexiblePasswordConstraint.readOptions(args),
      this.readEnvironment(),
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const resolved = resolvePasswordValidatorOptions(
      IsFlexiblePasswordConstraint.readOptions(args),
      this.readEnvironment(),
    );
    return buildPasswordPolicyMessage(resolved);
  }

  /** Mescla `ConfigService` (quando presente) com o ambiente cru como fallback. */
  private readEnvironment(): PasswordPolicyEnvironment {
    const environment = readPasswordPolicyEnvironment();
    if (!this.configService) return environment;

    return {
      minLength:
        this.configService.get<string | number>(PASSWORD_MIN_LENGTH_ENV_KEY) ??
        environment.minLength,
      minRules:
        this.configService.get<string | number>(PASSWORD_MIN_RULES_ENV_KEY) ??
        environment.minRules,
    };
  }

  /** Extrai as opções de política propagadas via `constraints` do decorator. */
  private static readOptions(
    args: ValidationArguments,
  ): PasswordValidatorOptions {
    const [options] = args.constraints as [PasswordValidatorOptions?];
    return options ?? {};
  }
}

/**
 * `@IsFlexiblePassword` — valida a senha segundo a política corporativa:
 * mínimo de 8 caracteres e pelo menos 2 de 4 critérios de complexidade
 * (minúscula, maiúscula, dígito, caractere especial). Os limites são
 * configuráveis via env (`PASSWORD_MIN_LENGTH` / `PASSWORD_MIN_RULES`) ou
 * sobrescritos por chamada.
 *
 * @param options Política do validador (`minLength`, `minRules`).
 * @param validationOptions Opções do `class-validator` (ex.: `message`, `groups`).
 *
 * @example
 *   @IsFlexiblePassword()                                  // 8 chars, 2 de 4
 *   @IsFlexiblePassword({ minLength: 12, minRules: 3 })    // política estrita
 */
export function IsFlexiblePassword(
  options: PasswordValidatorOptions = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'isFlexiblePassword',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: validationOptions,
      constraints: [options],
      validator: IsFlexiblePasswordConstraint,
    });
  };
}
