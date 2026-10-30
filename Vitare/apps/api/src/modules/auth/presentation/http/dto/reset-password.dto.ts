import { IsString, MaxLength } from 'class-validator';
import { IsFlexiblePassword } from '../../../../../common/decorators/is-flexible-password.decorator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @IsFlexiblePassword()
  @MaxLength(72)
  newPassword!: string;
}
