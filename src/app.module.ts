import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimeSlotsModule } from './modules/time-slots.module';

@Module({
  imports: [TimeSlotsModule],
    ConfigModule,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
