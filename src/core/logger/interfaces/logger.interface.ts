/**
 * Log level enumeration
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
    VERBOSE = 'verbose',
}

/**
 * Log entry interface
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context?: string;
    trace?: string;
    metadata?: Record<string, any>;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    maxFileSize?: string;
    maxFiles?: string;
    format?: 'json' | 'simple' | 'combined';
}

/**
 * Custom logger interface
 */
export interface ICustomLogger {
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    info(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void;
} 