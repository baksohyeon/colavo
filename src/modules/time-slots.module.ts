import { Module } from '@nestjs/common';
import { TimeSlotsController } from '../controllers/time-slots.controller';
import { TimeSlotsService } from '../services/time-slots.service';

@Module({
    controllers: [TimeSlotsController],
    providers: [TimeSlotsService],
    exports: [TimeSlotsService],
})
export class TimeSlotsModule { } 