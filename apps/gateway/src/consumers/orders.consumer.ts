import { ORDERS_BMQ } from '@app/common/bullmq/bullmq.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ORDERS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from 'apps/orders/src/dto/create-order.dto';
import { firstValueFrom } from 'rxjs';

@Processor(ORDERS_BMQ)
export class OrdersConsumer extends WorkerHost {
  private readonly logger: Logger = new Logger(OrdersConsumer.name);

  constructor(
    @Inject(ORDERS_MICROSERVICE)
    private readonly ordersMicroservice: ClientProxy,
  ) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    switch (job.name) {
      case 'createOrder': {
        // create order from createOrderDto
        const createOrderDto: CreateOrderDto = job.data;

        await this.ordersMicroservice.emit('createOrder', createOrderDto);

        return {};
      }
      default:
        break;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Completed job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: any) {
    this.logger.log(
      `Job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)} has failed.\nError details: ${JSON.stringify(error)}`,
    );
  }

  @OnWorkerEvent('error')
  onError(failedReason: any) {
    this.logger.log(
      `Error occured while running job: ${JSON.stringify(failedReason)}.`,
    );
  }
}
