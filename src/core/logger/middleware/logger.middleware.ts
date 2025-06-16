import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLoggerService } from '../services/custom-logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('Middleware');
    }

    use(request: Request, response: Response, next: NextFunction): void {
        const { ip, method, originalUrl: url } = request;
        const userAgent = request.get('User-Agent') || '';
        const startTime = Date.now();

        // Log request start
        this.logger.debug(
            `Request started: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
            'Middleware',
        );

        // Override response.end to log when response is sent
        const originalEnd = response.end;
        const logger = this.logger; // Capture logger instance
        response.end = function (this: Response, ...args: any[]): Response {
            const duration = Date.now() - startTime;
            const { statusCode } = response;
            const contentLength = response.get('content-length') || '0';

            logger.debug(
                `Request completed: ${method} ${url} ${statusCode} - ${duration}ms - ${contentLength} bytes`,
                'Middleware',
            );

            // Call original end method and return its result
            return originalEnd.apply(this, args);
        };

        next();
    }
} 