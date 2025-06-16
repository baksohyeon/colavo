import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/modules/app.module';
import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';

describe('Time Slots API (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        // 테스트 환경에서는 로그 출력을 비활성화
        app.useLogger(false);

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /getTimeSlots', () => {
        it('should return available time slots for start_day_identifier 20210509', async () => {
            const requestBody = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('start_of_day');
            expect(response.body[0]).toHaveProperty('day_modifier');
            expect(response.body[0]).toHaveProperty('is_day_off');
            expect(response.body[0]).toHaveProperty('timeslots');
        });

        it('should return available time slots for start_day_identifier 20210510', async () => {
            const requestBody = {
                start_day_identifier: '20210510',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });

        it('should return available time slots for start_day_identifier 20210511', async () => {
            const requestBody = {
                start_day_identifier: '20210511',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });

        it('should handle multiple days request', async () => {
            const requestBody = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 3,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
            expect(response.body[0].day_modifier).toBe(0);
            expect(response.body[1].day_modifier).toBe(1);
            expect(response.body[2].day_modifier).toBe(2);
        });

        it('should respect work hours when is_ignore_workhour is false', async () => {
            const requestBody = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: false,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should respect existing events when is_ignore_schedule is false', async () => {
            const requestBody = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: false,
                is_ignore_workhour: true,
            };

            const response = await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(requestBody)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 400 for invalid request body', async () => {
            const invalidRequestBody = {
                start_day_identifier: '20210509',
                // Missing required fields
            };

            await request(app.getHttpServer())
                .post('/getTimeSlots')
                .send(invalidRequestBody)
                .expect(400);
        });
    });

    describe('POST /health', () => {
        it('should return test success message', async () => {
            const response = await request(app.getHttpServer())
                .post('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message');
        });
    });
}); 