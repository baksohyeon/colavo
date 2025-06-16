# Time Slots Booking API

A robust NestJS-based API for generating available time slots for salon booking appointments with comprehensive timezone support and schedule management.

## 🚀 Project Overview

This API provides available time slots for booking appointments at salons, considering:
- **Timezone handling**: Accurate timezone conversion using IANA timezone identifiers
- **Work hours**: Configurable business hours and day-off settings
- **Existing appointments**: Conflict detection with existing events
- **Flexible scheduling**: Customizable service duration and time intervals
- **Multi-day support**: Generate slots for multiple consecutive days

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS (Express-based)
- **Package Manager**: Yarn v1.22+
- **Timezone**: date-fns-tz library for accurate timezone handling
- **Validation**: class-validator and class-transformer
- **Testing**: Jest (Unit & E2E tests)
- **Logging**: Winston with daily rotate file
- **Code Quality**: ESLint, Prettier
- **Build Tool**: SWC for fast compilation

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd colavo

# Install dependencies
yarn install
# or
yarn

# Run the application in development mode
yarn start:dev

# Run the application in production mode
yarn start:prod

# Run the application with debug mode
yarn start:debug
```

## 🛠️ Development Scripts

```bash
# Build the project
yarn build

# Format code with Prettier
yarn format

# Lint code with ESLint
yarn lint

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run tests in debug mode
yarn test:debug
```

## ⚡ Quick Start

```bash
# 1. Install dependencies
yarn

# 2. Run tests to verify setup
yarn test

# 3. Start development server
yarn start:dev

# 4. Test the API (in another terminal)
curl -X POST http://localhost:3000/health
```

## 🎯 API Documentation

### Endpoint: `POST /getTimeSlots`

Generate available time slots for booking appointments.

#### Request Body

```typescript
interface RequestBody {
    start_day_identifier: string;     // YYYYMMDD format (e.g., "20231001")
    timezone_identifier: string;      // IANA timezone (e.g., "Asia/Seoul")
    service_duration: number;         // Service duration in seconds
    days?: number;                    // Number of days to generate (default: 1)
    timeslot_interval?: number;       // Interval between slots in seconds (default: 1800)
    is_ignore_schedule?: boolean;     // Ignore existing events (default: false)
    is_ignore_workhour?: boolean;     // Ignore work hour restrictions (default: false)
}
```

#### Response

```typescript
interface ResponseBody {
    start_of_day: number;            // Unix timestamp (seconds)
    day_modifier: number;            // Day offset from start date
    is_day_off: boolean;             // Whether this day is off
    timeslots: Array<{
        begin_at: number;            // Unix timestamp (seconds)
        end_at: number;              // Unix timestamp (seconds)
    }>;
}[]
```

#### Example Request

```bash
curl -X POST http://localhost:3000/getTimeSlots \
  -H "Content-Type: application/json" \
  -d '{
    "start_day_identifier": "20231001",
    "timezone_identifier": "Asia/Seoul",
    "service_duration": 3600,
    "days": 3,
    "timeslot_interval": 1800,
    "is_ignore_schedule": false,
    "is_ignore_workhour": false
  }'
```

#### Example Response

```json
[
  {
    "start_of_day": 1696089600,
    "day_modifier": 0,
    "is_day_off": false,
    "timeslots": [
      {
        "begin_at": 1696125600,
        "end_at": 1696129200
      },
      {
        "begin_at": 1696127400,
        "end_at": 1696131000
      }
    ]
  }
]
```

### Health Check: `POST /health`

Simple health check endpoint for monitoring.

```bash
curl -X POST http://localhost:3000/health
```

**Response:**
```json
{
  "status": "success",
  "message": "Time slots API is working correctly"
}
```

## 🏗️ Project Structure

```
src/
├── modules/
│   └── time-slots/
│       ├── dto/
│       │   └── get-time-slots.dto.ts    # Request validation
│       ├── time-slots.controller.ts      # API endpoints
│       ├── time-slots.service.ts         # Business logic
│       └── time-slots.module.ts          # Module configuration
├── data/
│   ├── events.json                       # Existing appointments
│   └── workhours.json                    # Business hours configuration
├── models/
│   └── interfaces.ts                     # Type definitions
└── core/
    └── logger/                           # Custom logging service

test/
├── modules/
│   └── time-slots/
│       ├── time-slots.service.spec.ts    # Unit tests
│       └── time-slots.e2e-spec.ts        # End-to-end tests
```

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov
```

### Test Coverage

- **Unit Tests**: 31 test cases covering all service methods
- **E2E Tests**: 8 test cases covering API endpoints
- **Coverage Areas**:
  - Timezone handling (KST, UTC, EST, JST)
  - Work hour restrictions
  - Event conflict detection
  - Edge cases and error handling
  - Multi-day scenarios

## ⭐ Key Features

### 1. Timezone Accuracy

Uses `date-fns-tz` for precise timezone conversion:

```typescript
// Example: "20231001" in "Asia/Seoul" timezone
// Converts to: 2023-09-30 15:00:00 UTC (KST midnight → UTC-9)
parseStartDayIdentifierWithTimezone("20231001", "Asia/Seoul")
```

### 2. Flexible Schedule Management

- **Ignore Events**: `is_ignore_schedule=true` bypasses existing appointments
- **Ignore Work Hours**: `is_ignore_workhour=true` uses full 24-hour availability
- **Custom Intervals**: Configurable time slot intervals (default: 30 minutes)

### 3. Data Validation

- **Event Validation**: Filters out invalid events (begin_at >= end_at)
- **Work Hour Validation**: Warns about suspicious work hour configurations
- **Timezone Validation**: Comprehensive IANA timezone identifier validation

### 4. Robust Error Handling

- Graceful handling of invalid timezones
- Data file loading failures
- Malformed date identifiers
- Edge cases in time calculations

## 📊 Data Configuration

### Work Hours (`src/data/workhours.json`)

```json
[
  {
    "weekday": 1,              // 1=Sunday, 7=Saturday
    "open_interval": 36000,    // 10:00 AM (seconds from midnight)
    "close_interval": 72000,   // 8:00 PM (seconds from midnight)
    "is_day_off": false
  }
]
```

### Events (`src/data/events.json`)

```json
[
  {
    "begin_at": 1620268200,    // Unix timestamp (seconds)
    "end_at": 1620275400,      // Unix timestamp (seconds)
    "created_at": 1620272253,
    "updated_at": 1620272253
  }
]
```

## 🔍 Implementation Highlights

### Timezone Handling

```typescript
// Convert YYYYMMDD + timezone to UTC
const dateInTimezone = new Date(year, month, day, 0, 0, 0, 0);
const utcDate = fromZonedTime(dateInTimezone, timezoneId);
```

### Work Hour Calculation

```typescript
// Apply work hours in specified timezone
const workStartInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.open_interval * 1000);
const workEndInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.close_interval * 1000);
```

### Conflict Detection

```typescript
// Check time slot conflicts with existing events
const hasConflict = events.some(event => 
    !(slot.end_at <= event.begin_at || slot.begin_at >= event.end_at)
);
```

## 🚀 Production Deployment

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY . .
RUN yarn build
CMD ["yarn", "start:prod"]
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For questions or support, please contact:
- Email: frank@colavo.kr
- Phone: 010-9822-1569