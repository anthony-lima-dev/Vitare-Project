import { IsEmail, IsString } from 'class-validator';

export class CheckRealmDto {
  @IsEmail()
  email!: string;
}

export enum AuthMethod {
  OAUTH_GOOGLE = 'OAUTH_GOOGLE',
  LOCAL = 'LOCAL',
}

export class CheckRealmResponseDto {
  @IsEmail()
  email!: string;

  @IsString()
  authMethod!: AuthMethod;
}
