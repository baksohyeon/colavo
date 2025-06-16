import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '../core/config/config.module';
import { AppService } from '../app.service';
import { LoggerModule } from '../core/logger/logger.module';
import { LoggerMiddleware } from '../core/logger/middleware/logger.middleware';
import { LoggingInterceptor } from '../core/logger/interceptors/logging.interceptor';
import { AllExceptionsFilter } from '../core/logger/filters/all-exceptions.filter';
import { TimeSlotsModule } from '@/modules/time-slots/time-slots.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    TimeSlotsModule
  ],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
