import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain-error';

/**
 * Converte DomainError em resposta HTTP previsível, seguindo o envelope
 * padrão do NestJS ({ statusCode, message }) para manter compatibilidade com
 * os tratamentos já existentes nos frontends. Detalhes internos não vazam.
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.warn(
      `DomainError ${exception.code} (${exception.statusCode}): ${exception.message}`,
    );
    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      message: exception.message,
      error: exception.code,
    });
  }
}
