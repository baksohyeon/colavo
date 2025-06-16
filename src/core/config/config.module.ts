import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { CustomConfigService } from './services/config.service';
import { loadConfiguration } from './config';

@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            load: [loadConfiguration],
            envFilePath: ['.env.local', '.env'],
        }),
    ],
    providers: [CustomConfigService],
    exports: [CustomConfigService],
})
export class ConfigModule { } 