import { DomainError } from '../../../../shared/domain/domain-error';
import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
export class DeleteProductUseCase {
  constructor(private readonly repository: ProductRepositoryPort) {}
  async execute(id: string): Promise<void> {
    Product.assertId(id);
    if (!await this.repository.delete(id.toLowerCase())) throw new DomainError('NOT_FOUND', 'Product not found');
  }
}
