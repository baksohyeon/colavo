/**
 * Application configuration interface
 */
export interface AppConfig {
    port: number;
    nodeEnv: string;
    apiPrefix: string;
    corsEnabled: boolean;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    filePath: string;
    maxFileSize: string;
    maxFiles: string;
    format: 'json' | 'simple' | 'combined';
}

/**
 * JWT configuration interface
 */
export interface JwtConfig {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    database: number;
    ttl: number;
}

/**
 * Main configuration interface
 */
export interface Configuration {
    app: AppConfig;
    database: DatabaseConfig;
    logger: LoggerConfig;
    jwt: JwtConfig;
    redis: RedisConfig;
} 