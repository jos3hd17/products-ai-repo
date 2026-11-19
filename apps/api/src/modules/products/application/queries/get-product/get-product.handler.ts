import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT, ProductRepositoryPort } from '../../../domain/ports/product.repository.port';
import { ProductData } from '../../../domain/entities/product';
import { GetProductByIdUseCase } from '../../use-cases/get-product-by-id.use-case';
import { GetProductQuery } from './get-product.query';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery, ProductData> {
  private readonly workflow: GetProductByIdUseCase;
  constructor(@Inject(PRODUCT_REPOSITORY_PORT) repository: ProductRepositoryPort) {
    this.workflow = new GetProductByIdUseCase(repository);
  }
  execute(query: GetProductQuery): Promise<ProductData> {
    return this.workflow.execute(query.id);
  }
}
