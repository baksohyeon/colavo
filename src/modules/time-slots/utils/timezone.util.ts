import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { Injectable } from '@nestjs/common';
import { DATE_IDENTIFIER_LENGTH, DATE_FORMAT, TIME_FORMAT } from '../constants/time-slots.constants';

/**
 * Utility service for timezone operations
 */
@Injectable()
export class TimezoneUtil {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('TimezoneUtil');
    }

    /**
     * Validate timezone identifier and throw descriptive errors
     */
    validateTimezoneIdentifier(timezoneId: string): void {
        if (!timezoneId || typeof timezoneId !== 'string') {
            throw new Error('Invalid timezone identifier: must be a non-empty string');
        }

        if (timezoneId.trim().length === 0) {
            throw new Error('Invalid timezone identifier: cannot be empty or whitespace only');
        }

        if (!this.isValidTimezoneIdentifier(timezoneId)) {
            throw new Error(
                `Invalid timezone identifier: '${timezoneId}'. ` +
                'Please use a valid IANA timezone identifier (e.g., "UTC", "Asia/Seoul", "America/New_York")'
            );
        }

        this.logger.debug(`Timezone identifier validation passed: ${timezoneId}`);
    }

    /**
     * Check if timezone identifier is valid using date-fns-tz
     */
    private isValidTimezoneIdentifier(timezoneId: string): boolean {
        if (!timezoneId || typeof timezoneId !== 'string' || timezoneId.trim().length === 0) {
            this.logger.debug('Invalid timezone identifier format: empty or non-string value');
            return false;
        }

        try {
            const testDate = new Date();
            testDate.setMinutes(0, 0, 0);

            const zonedDate = toZonedTime(testDate, timezoneId);

            if (!zonedDate || !(zonedDate instanceof Date) || isNaN(zonedDate.getTime())) {
                this.logger.debug(`Timezone conversion failed for: ${timezoneId} - invalid result`);
                return false;
            }

            this.logger.debug(`Timezone identifier validated successfully: ${timezoneId}`);
            return true;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.debug(
                    `Invalid timezone identifier: ${timezoneId} - ${error.name}: ${error.message}`
                );
            } else {
                this.logger.debug(
                    `Invalid timezone identifier: ${timezoneId} - Unknown error: ${String(error)}`
                );
            }
            return false;
        }
    }

    /**
     * Parse start_day_identifier string to Date object considering timezone
     */
    parseStartDayIdentifierWithTimezone(identifier: string, timezoneId: string): Date {
        if (!identifier || identifier.length !== DATE_IDENTIFIER_LENGTH) {
            throw new Error(`Invalid start_day_identifier format: ${identifier}. Expected YYYYMMDD format.`);
        }

        const year = parseInt(identifier.substring(0, 4));
        const month = parseInt(identifier.substring(4, 6)) - 1;
        const day = parseInt(identifier.substring(6, 8));

        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error(`Invalid date components in start_day_identifier: ${identifier}`);
        }

        const dateInTimezone = new Date(year, month, day, 0, 0, 0, 0);
        const utcDate = fromZonedTime(dateInTimezone, timezoneId);

        this.logger.debug(
            `Parsed date ${identifier} in timezone ${timezoneId}: interpreted as ${dateInTimezone.toISOString()} in ${timezoneId}, converted to UTC: ${utcDate.toISOString()}`
        );

        return utcDate;
    }

    /**
     * Format date in specified timezone using date-fns-tz
     */
    formatDateInTimezone(date: Date, timezoneId: string): string {
        try {
            const zonedDate = toZonedTime(date, timezoneId);
            return format(zonedDate, DATE_FORMAT, { timeZone: timezoneId });
        } catch (error) {
            const errorMessage = error instanceof Error ?
                `${error.name}: ${error.message}` :
                String(error);

            this.logger.warn(
                `Failed to format date ${date.toISOString()} in timezone ${timezoneId}: ${errorMessage}. ` +
                'Falling back to UTC format'
            );

            return date.toISOString().split('T')[0];
        }
    }

    /**
     * Convert UTC date to timezone-aware date
     */
    convertToTimezone(utcDate: Date, timezoneId: string): Date {
        return toZonedTime(utcDate, timezoneId);
    }

    /**
     * Convert timezone-aware date to UTC
     */
    convertFromTimezone(zonedDate: Date, timezoneId: string): Date {
        return fromZonedTime(zonedDate, timezoneId);
    }

    /**
     * Format time in specified timezone
     */
    formatTimeInTimezone(date: Date, timezoneId: string): string {
        try {
            const zonedDate = toZonedTime(date, timezoneId);
            return format(zonedDate, TIME_FORMAT, { timeZone: timezoneId });
        } catch (error) {
            this.logger.warn(`Failed to format time in timezone ${timezoneId}, falling back to UTC`);
            return date.toISOString().slice(11, 16);
        }
    }
} 