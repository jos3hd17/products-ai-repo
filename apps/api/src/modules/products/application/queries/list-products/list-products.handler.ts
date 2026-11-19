import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT, ProductRepositoryPort } from '../../../domain/ports/product.repository.port';
import { ListProductsOutput } from '../../dto/product.contracts';
import { ListProductsUseCase } from '../../use-cases/list-products.use-case';
import { ListProductsQuery } from './list-products.query';

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<ListProductsQuery, ListProductsOutput> {
  private readonly workflow: ListProductsUseCase;
  constructor(@Inject(PRODUCT_REPOSITORY_PORT) repository: ProductRepositoryPort) {
    this.workflow = new ListProductsUseCase(repository);
  }
  execute(query: ListProductsQuery): Promise<ListProductsOutput> {
    return this.workflow.execute(query.input);
  }
}
