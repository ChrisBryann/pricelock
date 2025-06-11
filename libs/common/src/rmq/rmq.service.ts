import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqService {
  constructor(private readonly configService: ConfigService) {}

  getOptions(queue: string, noAck = false): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.getOrThrow<string>('RABBIT_MQ_URI')],
        queue: this.configService.getOrThrow<string>(
          `RABBIT_MQ_${queue}_QUEUE`,
        ),
        noAck, // specify if the message will be acknowledge automatically everytime it's finished to pop it off the queue --> useful if we want to handle message failures
        persistent: true, // maintain our list of messages
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
  }
}
