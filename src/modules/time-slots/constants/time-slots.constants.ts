/**
 * Constants used throughout the time slots module
 */

// Fixed date for the assignment (based on requirements)
export const TODAY = new Date('2021-09-10');
TODAY.setMinutes(0, 0, 0);

// Time calculations
export const SECONDS_IN_DAY = 24 * 60 * 60;
export const MILLISECONDS_IN_DAY = SECONDS_IN_DAY * 1000;
export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 60 * 60;

// Default values
export const DEFAULT_DAYS = 1;
export const DEFAULT_TIMESLOT_INTERVAL = 1800; // 30 minutes

// Date format
export const DATE_IDENTIFIER_LENGTH = 8;
export const DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm';

// Weekdays (1-7, Sunday-Saturday)
export const WEEKDAY_SUNDAY = 1;
export const WEEKDAY_SATURDAY = 7; 