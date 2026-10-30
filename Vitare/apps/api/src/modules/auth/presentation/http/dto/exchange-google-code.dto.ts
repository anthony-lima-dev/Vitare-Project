import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ExchangeGoogleCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code!: string;
}
