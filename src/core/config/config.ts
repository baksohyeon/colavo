import { Configuration, AppConfig, DatabaseConfig, LoggerConfig, JwtConfig, RedisConfig } from './interfaces/config.interface';

/**
 * Load application configuration from environment variables
 */
export function loadAppConfig(): AppConfig {
    return {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || 'api',
        corsEnabled: process.env.CORS_ENABLED === 'true',
    };
}

/**
 * Load database configuration from environment variables
 */
export function loadDatabaseConfig(): DatabaseConfig {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'colavo',
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.DB_LOGGING === 'true',
    };
}

/**
 * Load logger configuration from environment variables
 */
export function loadLoggerConfig(): LoggerConfig {
    return {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false',
        filePath: process.env.LOG_FILE_PATH || 'logs/application-%DATE%.log',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d',
        format: (process.env.LOG_FORMAT as 'json' | 'simple' | 'combined') || 'simple',
    };
}

/**
 * Load JWT configuration from environment variables
 */
export function loadJwtConfig(): JwtConfig {
    return {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    };
}

/**
 * Load Redis configuration from environment variables
 */
export function loadRedisConfig(): RedisConfig {
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DATABASE || '0', 10),
        ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
    };
}

/**
 * Load complete application configuration
 */
export function loadConfiguration(): Configuration {
    return {
        app: loadAppConfig(),
        database: loadDatabaseConfig(),
        logger: loadLoggerConfig(),
        jwt: loadJwtConfig(),
        redis: loadRedisConfig(),
    };
}

/**
 * Validate required environment variables
 */
export function validateConfiguration(): void {
    const requiredEnvVars = [
        'NODE_ENV',
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Validate PORT is a valid number
    const port = parseInt(process.env.PORT || '3000', 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be a valid number between 1 and 65535');
    }

    // Validate LOG_LEVEL
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (!validLogLevels.includes(logLevel)) {
        throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }
} 