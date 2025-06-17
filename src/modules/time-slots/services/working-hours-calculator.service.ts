import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { IWorkhour } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';
import { TimezoneUtil } from '../utils/timezone.util';
import { SECONDS_IN_DAY } from '../constants/time-slots.constants';

interface IWorkingHoursResult {
    workStartSeconds: number;
    workEndSeconds: number;
}

/**
 * Service responsible for calculating working hours with timezone considerations
 */
@Injectable()
export class WorkingHoursCalculatorService {
    constructor(
        private readonly logger: CustomLoggerService,
        private readonly timezoneUtil: TimezoneUtil,
    ) {
        this.logger.setContext('WorkingHoursCalculatorService');
    }

    /**
     * Calculate working hours considering timezone
     */
    calculateWorkingHoursWithTimezone(
        startOfDayUTC: number,
        dayWorkhour: IWorkhour | undefined,
        isIgnoreWorkhour: boolean,
        timezoneIdentifier: string
    ): IWorkingHoursResult {
        if (isIgnoreWorkhour) {
            this.logger.debug(
                `Work hours IGNORED - using full day (00:00-23:59) in ${timezoneIdentifier}`
            );
            return {
                workStartSeconds: startOfDayUTC,
                workEndSeconds: startOfDayUTC + SECONDS_IN_DAY - 1,
            };
        }

        if (!dayWorkhour) {
            this.logger.debug(
                `No work hours data - falling back to full day (00:00-23:59) in ${timezoneIdentifier}`
            );
            return {
                workStartSeconds: startOfDayUTC,
                workEndSeconds: startOfDayUTC + SECONDS_IN_DAY - 1,
            };
        }

        const utcStartOfDay = new Date(startOfDayUTC * 1000);
        const zonedStartOfDay = this.timezoneUtil.convertToTimezone(utcStartOfDay, timezoneIdentifier);

        this.logger.debug(
            `Timezone conversion: UTC ${utcStartOfDay.toISOString()} → ${timezoneIdentifier} ${zonedStartOfDay.toISOString()}`
        );

        const workStartInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.open_interval * 1000);
        const workEndInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.close_interval * 1000);

        const workStartUTC = this.timezoneUtil.convertFromTimezone(workStartInTimezone, timezoneIdentifier);
        const workEndUTC = this.timezoneUtil.convertFromTimezone(workEndInTimezone, timezoneIdentifier);

        const workStartSeconds = Math.floor(workStartUTC.getTime() / 1000);
        const workEndSeconds = Math.floor(workEndUTC.getTime() / 1000);

        this.logWorkingHoursCalculation(
            dayWorkhour,
            workStartInTimezone,
            workEndInTimezone,
            workStartUTC,
            workEndUTC,
            timezoneIdentifier
        );

        return { workStartSeconds, workEndSeconds };
    }

    /**
     * Get weekday number (1-7, Sun-Sat) from UTC date
     */
    getWeekdayUTC(date: Date): number {
        return date.getUTCDay() + 1;
    }

    /**
     * Convert seconds from start of day to HH:MM format
     */
    convertSecondsToTimeString(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Log working hours calculation details
     */
    private logWorkingHoursCalculation(
        dayWorkhour: IWorkhour,
        workStartInTimezone: Date,
        workEndInTimezone: Date,
        workStartUTC: Date,
        workEndUTC: Date,
        timezoneIdentifier: string
    ): void {
        try {
            const workStartFormatted = this.timezoneUtil.formatTimeInTimezone(workStartInTimezone, timezoneIdentifier);
            const workEndFormatted = this.timezoneUtil.formatTimeInTimezone(workEndInTimezone, timezoneIdentifier);

            this.logger.debug(`Work hours calculation for ${timezoneIdentifier}:`);
            this.logger.debug(
                `• Raw intervals: open=${dayWorkhour.open_interval}s (${this.convertSecondsToTimeString(dayWorkhour.open_interval)}), close=${dayWorkhour.close_interval}s (${this.convertSecondsToTimeString(dayWorkhour.close_interval)})`
            );
            this.logger.debug(
                `• Local time: ${workStartFormatted} → ${workEndFormatted} (${timezoneIdentifier})`
            );
            this.logger.debug(
                `• UTC time: ${workStartUTC.toISOString()} → ${workEndUTC.toISOString()}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.debug(
                `Work hours for ${timezoneIdentifier} (formatting failed: ${errorMessage}): ` +
                `open=${dayWorkhour.open_interval}s, close=${dayWorkhour.close_interval}s`
            );
        }
    }
} 