import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT, ProductRepositoryPort } from '../../../domain/ports/product.repository.port';
import { DeleteProductUseCase } from '../../use-cases/delete-product.use-case';
import { DeleteProductCommand } from './delete-product.command';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand, void> {
  private readonly workflow: DeleteProductUseCase;
  constructor(@Inject(PRODUCT_REPOSITORY_PORT) repository: ProductRepositoryPort) {
    this.workflow = new DeleteProductUseCase(repository);
  }
  execute(command: DeleteProductCommand): Promise<void> {
    return this.workflow.execute(command.id);
  }
}
