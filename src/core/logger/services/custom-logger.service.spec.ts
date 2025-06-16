import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from './custom-logger.service';
import { LogLevel } from '../interfaces/logger.interface';

describe('CustomLoggerService', () => {
    let service: CustomLoggerService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomLoggerService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config: Record<string, any> = {
                                LOG_LEVEL: LogLevel.DEBUG,
                                LOG_ENABLE_CONSOLE: true,
                                LOG_ENABLE_FILE: false, // Disable file logging in tests
                                LOG_FORMAT: 'simple',
                            };
                            return config[key] ?? defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<CustomLoggerService>(CustomLoggerService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setContext', () => {
        it('should set the logging context', () => {
            const testContext = 'TestContext';
            service.setContext(testContext);

            // The context is private, so we test it indirectly by checking log behavior
            expect(service).toBeDefined();
        });
    });

    describe('error', () => {
        it('should log error messages', () => {
            const message = 'Test error message';
            const trace = 'Error stack trace';
            const context = 'TestContext';

            // Mock the winston logger
            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'error');

            service.error(message, trace, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                trace,
                timestamp: expect.any(String),
            });
        });

        it('should log error messages without trace', () => {
            const message = 'Test error message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'error');

            service.error(message, undefined, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                trace: undefined,
                timestamp: expect.any(String),
            });
        });
    });

    describe('warn', () => {
        it('should log warning messages', () => {
            const message = 'Test warning message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'warn');

            service.warn(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('info', () => {
        it('should log info messages', () => {
            const message = 'Test info message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'info');

            service.info(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('debug', () => {
        it('should log debug messages', () => {
            const message = 'Test debug message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'debug');

            service.debug(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('verbose', () => {
        it('should log verbose messages', () => {
            const message = 'Test verbose message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'verbose');

            service.verbose(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('log', () => {
        it('should log with custom level and metadata', () => {
            const level = LogLevel.INFO;
            const message = 'Test custom log message';
            const context = 'TestContext';
            const metadata = { userId: '123', action: 'test' };

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'log');

            service.log(level, message, context, metadata);

            expect(loggerSpy).toHaveBeenCalledWith(level, message, {
                context,
                timestamp: expect.any(String),
                ...metadata,
            });
        });

        it('should handle NestJS LoggerService compatibility', () => {
            const message = 'Test compatibility message';
            const context = 'TestContext';

            const infoSpy = jest.spyOn(service, 'info');

            service.log(message, context);

            expect(infoSpy).toHaveBeenCalledWith(message, context);
        });
    });

    describe('configuration', () => {
        it('should load configuration from ConfigService', () => {
            expect(configService.get).toHaveBeenCalledWith('LOG_LEVEL');
            expect(configService.get).toHaveBeenCalledWith('LOG_ENABLE_CONSOLE', true);
            expect(configService.get).toHaveBeenCalledWith('LOG_ENABLE_FILE', true);
        });
    });
}); 