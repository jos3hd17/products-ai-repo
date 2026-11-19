import { Product, ProductData } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { DomainError } from '../../../../shared/domain/domain-error';
export class GetProductByIdUseCase {
  constructor(private readonly repository: ProductRepositoryPort) {}
  async execute(id: string): Promise<ProductData> {
    Product.assertId(id);
    const product = await this.repository.findById(id.toLowerCase());
    if (!product) throw new DomainError('NOT_FOUND', 'Product not found');
    return product.toData();
  }
}
