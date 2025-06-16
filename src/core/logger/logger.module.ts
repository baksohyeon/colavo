import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { CustomLoggerService } from './services/custom-logger.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        CustomLoggerService,
        LoggingInterceptor,
        AllExceptionsFilter,
    ],
    exports: [
        CustomLoggerService,
        LoggingInterceptor,
        AllExceptionsFilter,
    ],
})
export class LoggerModule { } 