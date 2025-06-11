import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ORDERS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';
import { UpdateOrderStatusDto } from 'apps/orders/src/dto/update-order-status.dto';

@UseGuards(AuthGatewayGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(ORDERS_MICROSERVICE)
    private readonly ordersMicroservice: ClientProxy,
  ) {}

  @Get()
  async getHello(): Promise<string> {
    return await firstValueFrom(
      this.ordersMicroservice.send({ cmd: 'getHello' }, {}),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await firstValueFrom(
      this.ordersMicroservice.send(
        { cmd: 'findOrderById' },
        {
          id,
        },
      ),
    );
  }

  @Put('/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return await firstValueFrom(
      this.ordersMicroservice.send(
        {
          cmd: 'updateOrderStatus',
        },
        {
          id,
          updateOrderStatusDto,
        },
      ),
    );
  }
}
