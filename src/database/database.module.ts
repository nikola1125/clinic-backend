import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        url: config.databaseUrl,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.DB_SYNC === 'true',
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
