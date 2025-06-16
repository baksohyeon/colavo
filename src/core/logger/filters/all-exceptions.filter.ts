import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../services/custom-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('ExceptionFilter');
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const httpStatus = this.getHttpStatus(exception);
        const errorMessage = this.getErrorMessage(exception);
        const timestamp = new Date().toISOString();

        const errorResponse = {
            statusCode: httpStatus,
            timestamp,
            path: request.url,
            method: request.method,
            message: errorMessage,
        };

        // Log the error
        this.logger.error(
            `${request.method} ${request.url} - ${httpStatus} ${errorMessage}`,
            this.getErrorStack(exception),
            'ExceptionFilter',
        );

        response.status(httpStatus).json(errorResponse);
    }

    /**
     * Get HTTP status code from exception
     */
    private getHttpStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus();
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    /**
     * Get error message from exception
     */
    private getErrorMessage(exception: unknown): string {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'string') {
                return response;
            }
            if (typeof response === 'object' && response !== null) {
                return (response as any).message || exception.message;
            }
        }

        if (exception instanceof Error) {
            return exception.message;
        }

        return 'Internal server error';
    }

    /**
     * Get error stack trace from exception
     */
    private getErrorStack(exception: unknown): string {
        if (exception instanceof Error) {
            return exception.stack || '';
        }
        return String(exception);
    }
} 