import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT, ProductRepositoryPort } from '../../../domain/ports/product.repository.port';
import { ProductData } from '../../../domain/entities/product';
import { CreateProductUseCase } from '../../use-cases/create-product.use-case';
import { CreateProductCommand } from './create-product.command';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand, ProductData> {
  private readonly workflow: CreateProductUseCase;
  constructor(@Inject(PRODUCT_REPOSITORY_PORT) repository: ProductRepositoryPort) {
    this.workflow = new CreateProductUseCase(repository);
  }
  execute(command: CreateProductCommand): Promise<ProductData> {
    return this.workflow.execute(command.input);
  }
}
