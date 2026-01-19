import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpExceptionBody, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from 'generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      // erros lançados manualmente ou pelo nest

      httpStatus = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      }

      if (typeof response === 'object' && response !== null) {
        const responseBody = response as HttpExceptionBody;

        message = Array.isArray(responseBody.message) ? responseBody.message[0] : responseBody.message;
        errorType = responseBody.error || errorType;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // erros lançados pelo prisma

      switch ((exception as Prisma.PrismaClientKnownRequestError).code) {
        case 'P2002':
          httpStatus = HttpStatus.CONFLICT;
          message = 'Este registro já existe no sistema.';
          errorType = 'Conflict';
          break;

        case 'P2025':
          httpStatus = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado.';
          errorType = 'NotFound';
          break;

        case 'P2003':
          httpStatus = HttpStatus.BAD_REQUEST;
          message = 'Não é possível realizar esta operação devido a dependências de dados.';
          errorType = 'ForeignKeyConstraint';
          break;

        default:
          console.error('[Erro Prisma]:', exception);
          break;
      }
    } else {
      // erros genéricos/inesperados

      console.error('[Erro Inesperado]:', exception);
    }

    const response = {
      statusCode: httpStatus,
      error: errorType,
      message,
    };

    httpAdapter.reply(ctx.getResponse(), response, httpStatus);
  }
}
