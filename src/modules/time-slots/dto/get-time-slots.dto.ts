import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

/**
 * Data Transfer Object for getting available time slots request
 */
export class GetTimeSlotsDto {
    /**
     * Start day identifier in YYYYMMDD format
     * @example "20231001" for October 1st, 2023
     */
    @IsString()
    start_day_identifier: string;

    /**
     * Timezone identifier that determines how days are separated
     * Uses IANA timezone format (e.g., "Asia/Seoul", "UTC", "America/New_York")
     * @example "Asia/Seoul"
     */
    @IsString()
    timezone_identifier: string;

    /**
     * Service duration in seconds (Unix interval)
     * Represents how long the service takes to complete
     * @example 600 for a 10-minute service
     */
    @IsNumber()
    @Min(1)
    service_duration: number;

    /**
     * Number of days to return starting from start_day_identifier
     * If start_day_identifier is October 1st and days is 3,
     * returns results for October 1st, 2nd, and 3rd
     * @default 1
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    days?: number = 1;

    /**
     * Time interval between available time slots in seconds (Unix interval)
     * @default 1800 (30 minutes)
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    timeslot_interval?: number = 1800; // 30 minutes default

    /**
     * Whether to ignore existing events in the specified time period
     * When true, existing events will not block time slot availability
     * @default false
     */
    @IsOptional()
    @IsBoolean()
    is_ignore_schedule?: boolean = false;

    /**
     * Whether to ignore salon work hour settings
     * When true, ignores is_day_off, open_interval, and close_interval
     * and uses the entire day as the available time period
     * @default false
     */
    @IsOptional()
    @IsBoolean()
    is_ignore_workhour?: boolean = false;
} 