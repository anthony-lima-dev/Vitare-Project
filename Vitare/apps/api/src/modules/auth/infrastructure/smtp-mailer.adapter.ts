import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../infra/email/email.service';
import { MailerPort } from '../application/ports/mailer.port';

/** Adapter de infraestrutura: MailerPort sobre o serviço SMTP compartilhado. */
@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  constructor(private readonly email: EmailService) {}

  sendWelcome(to: string, fullName: string): Promise<void> {
    return this.email.sendWelcome(to, fullName);
  }

  sendPasswordReset(to: string, rawToken: string): Promise<void> {
    return this.email.sendPasswordReset(to, rawToken);
  }
}
