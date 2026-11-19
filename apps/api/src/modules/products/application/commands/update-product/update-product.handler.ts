import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT, ProductRepositoryPort } from '../../../domain/ports/product.repository.port';
import { ProductData } from '../../../domain/entities/product';
import { UpdateProductUseCase } from '../../use-cases/update-product.use-case';
import { UpdateProductCommand } from './update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, ProductData> {
  private readonly workflow: UpdateProductUseCase;
  constructor(@Inject(PRODUCT_REPOSITORY_PORT) repository: ProductRepositoryPort) {
    this.workflow = new UpdateProductUseCase(repository);
  }
  execute(command: UpdateProductCommand): Promise<ProductData> {
    return this.workflow.execute(command.id, command.input);
  }
}
