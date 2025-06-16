import { Injectable } from '@nestjs/common';
import { Configuration, AppConfig, DatabaseConfig, LoggerConfig, JwtConfig, RedisConfig } from '../interfaces/config.interface';
import { loadConfiguration, validateConfiguration } from '../config';

@Injectable()
export class CustomConfigService {
    private readonly configuration: Configuration;

    constructor() {
        // Validate configuration on startup
        validateConfiguration();

        // Load configuration
        this.configuration = loadConfiguration();
    }

    /**
     * Get application configuration
     */
    get app(): AppConfig {
        return this.configuration.app;
    }

    /**
     * Get database configuration
     */
    get database(): DatabaseConfig {
        return this.configuration.database;
    }

    /**
     * Get logger configuration
     */
    get logger(): LoggerConfig {
        return this.configuration.logger;
    }

    /**
     * Get JWT configuration
     */
    get jwt(): JwtConfig {
        return this.configuration.jwt;
    }

    /**
     * Get Redis configuration
     */
    get redis(): RedisConfig {
        return this.configuration.redis;
    }

    /**
     * Get a specific configuration value by path
     */
    get<T = any>(path: string, defaultValue?: T): T {
        return this.getNestedValue(this.configuration, path) ?? defaultValue;
    }

    /**
     * Check if the application is in development mode
     */
    get isDevelopment(): boolean {
        return this.configuration.app.nodeEnv === 'development';
    }

    /**
     * Check if the application is in production mode
     */
    get isProduction(): boolean {
        return this.configuration.app.nodeEnv === 'production';
    }

    /**
     * Check if the application is in test mode
     */
    get isTest(): boolean {
        return this.configuration.app.nodeEnv === 'test';
    }

    /**
     * Get the server port
     */
    get port(): number {
        return this.configuration.app.port;
    }

    /**
     * Get the node environment
     */
    get nodeEnv(): string {
        return this.configuration.app.nodeEnv;
    }

    /**
     * Get complete configuration object
     */
    get all(): Configuration {
        return { ...this.configuration };
    }

    /**
     * Helper method to get nested configuration values
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Validate a specific configuration section
     */
    validateSection(section: keyof Configuration): boolean {
        const sectionConfig = this.configuration[section];

        if (!sectionConfig || typeof sectionConfig !== 'object') {
            return false;
        }

        // Check that all required properties exist
        switch (section) {
            case 'app':
                return !!(sectionConfig as AppConfig).port && !!(sectionConfig as AppConfig).nodeEnv;
            case 'database':
                return !!(sectionConfig as DatabaseConfig).host && !!(sectionConfig as DatabaseConfig).database;
            case 'logger':
                return !!(sectionConfig as LoggerConfig).level;
            case 'jwt':
                return !!(sectionConfig as JwtConfig).secret;
            case 'redis':
                return !!(sectionConfig as RedisConfig).host;
            default:
                return true;
        }
    }

    /**
     * Get environment variable directly
     */
    getEnv(key: string, defaultValue?: string): string | undefined {
        return process.env[key] ?? defaultValue;
    }

    /**
     * Get boolean environment variable
     */
    getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }
        return value.toLowerCase() === 'true';
    }

    /**
     * Get number environment variable
     */
    getNumberEnv(key: string, defaultValue?: number): number | undefined {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
} 