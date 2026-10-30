/**
 * Porta de saída do contexto Auth para envio de e-mails transacionais.
 * A aplicação não conhece SMTP, filas ou providers de e-mail.
 */
export interface MailerPort {
  sendWelcome(to: string, fullName: string): Promise<void>;
  sendPasswordReset(to: string, rawToken: string): Promise<void>;
}

export const MAILER_PORT = Symbol('MAILER_PORT');
