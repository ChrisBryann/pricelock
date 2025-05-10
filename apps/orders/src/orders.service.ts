import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { EntityManager, Repository } from 'typeorm';
import { OrderStatus } from '@app/common/enums/order-status.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { ORDERS_BMQ } from '@app/common/bullmq/bullmq.constant';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectQueue(ORDERS_BMQ) private readonly ordersQueue: Queue,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async create(createOrderDto: CreateOrderDto, manager?: EntityManager) {
    // create orders based off the commitment id
    const repo = manager ? manager.getRepository(Order) : this.ordersRepository;
    try {
      await this.findOneByCommtimentId(
        createOrderDto.commitmentId,
        manager,
        true,
      );
      // if an order with the given commitment Id exists already, then throw error
      throw new ForbiddenException(
        'Order with the given commitment ID already exist!',
      );
    } catch {}

    const order = await repo.create({
      ...createOrderDto,
      commitment: {
        id: createOrderDto.commitmentId,
      },
      buyer: {
        id: createOrderDto.buyerId,
      },
    });

    return await repo.save(order);
  }

  async createBulk(createOrderDtos: CreateOrderDto[]) {
    // TODO: In each bullk job, have a single transaction to create the item, unless creating item doesn't depend on other rows
    await this.ordersQueue.addBulk(
      createOrderDtos.map((createOrderDto) => ({
        name: 'createOrder',
        data: createOrderDto,
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );
  }

  async findOneByCommtimentId(
    commitmentId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager ? manager.getRepository(Order) : this.ordersRepository;

    let query = repo
      .createQueryBuilder('order')
      .leftJoin('order.commitment', 'commitment')
      .addSelect('commitment.id')
      .where('commitment.id = :id', { id: commitmentId });

    if (lock) {
      query = query.setLock('pessimistic_write');
    }

    const order = await query.getOne();

    if (!order) {
      throw new NotFoundException('Order does not exist!');
    }

    return order;
  }

  async findOne(id: string, manager?: EntityManager, lock: boolean = false) {
    const repo = manager ? manager.getRepository(Order) : this.ordersRepository;

    let query = repo
      .createQueryBuilder('order')
      .leftJoin('order.commitment', 'commitment')
      .addSelect('commitment.id')
      .leftJoin('order.buyer', 'buyer')
      .addSelect('buyer.id')
      .where('order.id = :id', { id });

    if (lock) {
      query = query.setLock('pessimistic_write');
    }

    const order = await query.getOne();

    if (!order) {
      throw new NotFoundException('Order does not exist!');
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Order) : this.ordersRepository;

    return await repo.manager.transaction(async (manager) => {
      const order = await this.findOne(id, manager, true);

      order.status = status;

      await manager.getRepository(Order).save(order);

      return order;
    });
  }
}
