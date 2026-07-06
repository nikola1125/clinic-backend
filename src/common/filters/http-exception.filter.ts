import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let detail: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        detail = (exceptionResponse as any).detail;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      detail = exception.stack;
    }

    // Log error with context
    this.logger.error(
      JSON.stringify({
        requestId,
        status,
        message,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      }),
    );

    // Report only genuine server errors to Sentry (no-op unless SENTRY_DSN
    // is set). 4xx are client/validation errors and would just be noise.
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('requestId', String(requestId));
        scope.setContext('request', {
          path: request.url,
          method: request.method,
        });
        Sentry.captureException(exception);
      });
    }

    // Return consistent error response
    response.status(status).json({
      statusCode: status,
      message,
      detail: status >= 500 ? undefined : detail, // Don't expose internal errors
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
