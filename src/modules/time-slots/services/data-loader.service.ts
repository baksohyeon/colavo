import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { IEvent, IWorkhour } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';

/**
 * Service responsible for loading data from JSON files
 */
@Injectable()
export class DataLoaderService {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('DataLoaderService');
    }

    /**
     * Load events data from JSON file
     */
    async loadEvents(): Promise<IEvent[]> {
        try {
            this.logger.debug('Loading events data from JSON file');
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'events.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const events = JSON.parse(fileContent) as IEvent[];
            this.logger.debug(`Successfully loaded ${events.length} events`);
            return events;
        } catch (error) {
            this.logger.error(
                'Error loading events data',
                error instanceof Error ? error.stack : String(error)
            );
            return [];
        }
    }

    /**
     * Load work hours data from JSON file
     */
    async loadWorkhours(): Promise<IWorkhour[]> {
        try {
            this.logger.debug('Loading work hours data from JSON file');
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'workhours.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const workhours = JSON.parse(fileContent) as IWorkhour[];
            this.logger.debug(`Successfully loaded ${workhours.length} work hour entries`);
            return workhours;
        } catch (error) {
            this.logger.error(
                'Error loading work hours data',
                error instanceof Error ? error.stack : String(error)
            );
            return [];
        }
    }
} 