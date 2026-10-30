import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromAddress = this.config.get<string>('MAIL_FROM')!;
    this.appUrl = this.config.get<string>('APP_URL')!;
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<void> {
    const resetLink = `${this.appUrl}/auth/reset-password?token=${rawToken}`;
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Vitare — Redefinição de senha',
      html: `<p>Clique para redefinir sua senha (expira em 1h): <a href="${resetLink}">${resetLink}</a></p>`,
    });
    if (error)
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${error.message}`);
  }

  async sendWelcome(to: string, fullName: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Bem-vindo ao Vitare',
      html: `<p>Olá, ${fullName}. Sua conta foi criada com sucesso.</p>`,
    });
    if (error)
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${error.message}`);
  }
}
