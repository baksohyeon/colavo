import { Injectable, LoggerService } from '@nestjs/common';
import { CustomConfigService } from '../../config/services/config.service';
import { ICustomLogger, LogLevel, LogEntry, LoggerConfig } from '../interfaces/logger.interface';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class CustomLoggerService implements LoggerService, ICustomLogger {
    private readonly winstonLogger: winston.Logger;
    private readonly config: LoggerConfig;
    private context = 'Application';

    constructor(private readonly configService: CustomConfigService) {
        this.config = this.loadConfiguration();
        this.winstonLogger = this.createWinstonLogger();
    }

    /**
     * Set context for logging
     */
    setContext(context: string): void {
        this.context = context;
    }

    /**
     * Log error messages
     */
    error(message: string, trace?: string, context?: string): void {
        this.winstonLogger.error(message, {
            context: context || this.context,
            trace,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log warning messages
     */
    warn(message: string, context?: string): void {
        this.winstonLogger.warn(message, {
            context: context || this.context,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log info messages
     */
    info(message: string, context?: string): void {
        this.winstonLogger.info(message, {
            context: context || this.context,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log debug messages
     */
    debug(message: string, context?: string): void {
        this.winstonLogger.debug(message, {
            context: context || this.context,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log verbose messages
     */
    verbose(message: string, context?: string): void {
        this.winstonLogger.verbose(message, {
            context: context || this.context,
            timestamp: new Date().toISOString(),
        });
    }

    /**
 * Generic log method with overloads for NestJS compatibility
 */
    log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void;
    log(message: any, context?: string): void;
    log(levelOrMessage: LogLevel | any, messageOrContext?: string, context?: string, metadata?: Record<string, any>): void {
        if (typeof levelOrMessage === 'string' && Object.values(LogLevel).includes(levelOrMessage as LogLevel)) {
            // Generic log method
            this.winstonLogger.log(levelOrMessage, messageOrContext || '', {
                context: context || this.context,
                timestamp: new Date().toISOString(),
                ...metadata,
            });
        } else {
            // NestJS LoggerService compatibility
            this.info(levelOrMessage, messageOrContext);
        }
    }

    /**
     * Create Winston logger instance
     */
    private createWinstonLogger(): winston.Logger {
        const transports: winston.transport[] = [];

        // Console transport
        if (this.config.enableConsole) {
            transports.push(
                new winston.transports.Console({
                    format: this.getConsoleFormat(),
                }),
            );
        }

        // File transport
        if (this.config.enableFile) {
            transports.push(
                new winston.transports.DailyRotateFile({
                    filename: this.config.filePath || 'logs/application-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: this.config.maxFileSize || '20m',
                    maxFiles: this.config.maxFiles || '14d',
                    format: this.getFileFormat(),
                }),
            );

            // Error log file
            transports.push(
                new winston.transports.DailyRotateFile({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: this.config.maxFileSize || '20m',
                    maxFiles: this.config.maxFiles || '14d',
                    format: this.getFileFormat(),
                }),
            );
        }

        return winston.createLogger({
            level: this.config.level,
            transports,
            exitOnError: false,
        });
    }

    /**
     * Get console format based on configuration
     */
    private getConsoleFormat(): winston.Logform.Format {
        const colorize = winston.format.colorize();

        return winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, context, trace }) => {
                let logMessage = `${timestamp} [${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`;
                if (trace) {
                    logMessage += `\n${trace}`;
                }
                return colorize.colorize(level, logMessage);
            }),
        );
    }

    /**
     * Get file format based on configuration
     */
    private getFileFormat(): winston.Logform.Format {
        if (this.config.format === 'json') {
            return winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            );
        }

        return winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
                let logMessage = `${timestamp} [${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`;
                if (Object.keys(meta).length > 0) {
                    logMessage += ` ${JSON.stringify(meta)}`;
                }
                if (trace) {
                    logMessage += `\n${trace}`;
                }
                return logMessage;
            }),
        );
    }

    /**
 * Load logger configuration from custom config service
 */
    private loadConfiguration(): LoggerConfig {
        const loggerConfig = this.configService.logger;
        return {
            level: loggerConfig.level as LogLevel,
            enableConsole: loggerConfig.enableConsole,
            enableFile: loggerConfig.enableFile,
            filePath: loggerConfig.filePath,
            maxFileSize: loggerConfig.maxFileSize,
            maxFiles: loggerConfig.maxFiles,
            format: loggerConfig.format,
        };
    }
} 