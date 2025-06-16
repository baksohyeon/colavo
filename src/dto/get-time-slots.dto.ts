import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

/**
 * Data Transfer Object for getting available time slots request
 */
export class GetTimeSlotsDto {
    @IsString()
    start_day_identifier: string;

    @IsString()
    timezone_identifier: string;

    @IsNumber()
    @Min(1)
    service_duration: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    days?: number = 1;

    @IsOptional()
    @IsNumber()
    @Min(1)
    timeslot_interval?: number = 1800; // 30 minutes default

    @IsOptional()
    @IsBoolean()
    is_ignore_schedule?: boolean = false;

    @IsOptional()
    @IsBoolean()
    is_ignore_workhour?: boolean = false;
} 