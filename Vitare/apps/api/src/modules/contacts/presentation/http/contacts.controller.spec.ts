import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from '../../application/contacts.service';

describe('ContactsController', () => {
  let controller: ContactsController;
  const mockService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: mockService }],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('remove exige vínculo ao usuário autenticado', async () => {
    await controller.remove('ct-1', { id: 'user-1', email: 'a@b.co' });
    expect(mockService.remove).toHaveBeenCalledWith('ct-1', 'user-1');
  });
});
