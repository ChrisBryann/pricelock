import { BullModule, RegisterQueueAsyncOptions } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('BULLMQ_HOST'),
          port: +configService.getOrThrow<string>('BULLMQ_PORT'),
        },
      }),
    }),
  ],
})
export class BmqModule {
  static register(names: string[]): DynamicModule {
    return {
      module: BmqModule,
      imports: [
        BullModule.registerQueueAsync(
          ...names.map(
            (name) =>
              ({
                name,
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                  port: +configService.getOrThrow<string>('BULLMQ_PORT'),
                }),
              }) as RegisterQueueAsyncOptions,
          ),
        ),
      ],
      exports: [BullModule],
    };
  }
}
