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

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async create(createOrderDto: CreateOrderDto, manager?: EntityManager) {
    // create orders based off the commitment id
    const repo = manager ? manager.getRepository(Order) : this.ordersRepository;
    try {
      await this.findOneByCommitmentId(
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

  async findOneByCommitmentId(
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

    if (lock && !!manager) {
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

    if (lock && !!manager) {
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
