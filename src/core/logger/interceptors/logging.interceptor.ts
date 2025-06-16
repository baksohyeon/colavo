import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../services/custom-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const startTime = Date.now();

        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';

        this.logger.info(
            `Incoming Request: ${method} ${url}`,
            'HTTP',
        );

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                const { statusCode } = response;

                this.logger.info(
                    `Outgoing Response: ${method} ${url} ${statusCode} - ${duration}ms`,
                    'HTTP',
                );

                // Log request details in debug mode
                this.logger.debug(
                    `Request Details: ${method} ${url}`,
                    'HTTP',
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                const statusCode = error.status || 500;

                this.logger.error(
                    `Request Error: ${method} ${url} ${statusCode} - ${duration}ms`,
                    error.stack,
                    'HTTP',
                );

                throw error;
            }),
        );
    }
} 