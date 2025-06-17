import { Module } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';
import { LoggerModule } from '@/core/logger/logger.module';
import { TimezoneUtil } from './utils/timezone.util';
import { DataLoaderService } from './services/data-loader.service';
import { WorkingHoursCalculatorService } from './services/working-hours-calculator.service';
import { TimeslotGeneratorService } from './services/timeslot-generator.service';

@Module({
    imports: [LoggerModule],
    controllers: [TimeSlotsController],
    providers: [
        TimeSlotsService,
        TimezoneUtil,
        DataLoaderService,
        WorkingHoursCalculatorService,
        TimeslotGeneratorService,
    ],
    exports: [TimeSlotsService],
})
export class TimeSlotsModule { } 