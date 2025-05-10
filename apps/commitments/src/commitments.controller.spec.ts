import { Test, TestingModule } from '@nestjs/testing';
import { CommitmentsController } from './commitments.controller';
import { CommitmentsService } from './commitments.service';

describe('CommitmentsController', () => {
  let commitmentsController: CommitmentsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CommitmentsController],
      providers: [CommitmentsService],
    }).compile();

    commitmentsController = app.get<CommitmentsController>(
      CommitmentsController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(commitmentsController.getHello()).toBe('Hello World!');
    });
  });
});
