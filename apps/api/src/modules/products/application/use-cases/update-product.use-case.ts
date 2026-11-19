import { DomainError } from '../../../../shared/domain/domain-error';
import { Product, ProductData } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { UpdateProductInput } from '../dto/product.contracts';
export class UpdateProductUseCase {
  constructor(private readonly repository: ProductRepositoryPort) {}
  async execute(id: string, input: UpdateProductInput): Promise<ProductData> {
    Product.assertId(id);
    const changes = Product.validateChanges(input);
    const product = await this.repository.update(id.toLowerCase(), changes);
    if (!product) throw new DomainError('NOT_FOUND', 'Product not found');
    return product.toData();
  }
}
