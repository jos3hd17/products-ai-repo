import { Product, ProductData } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { CreateProductInput } from '../dto/product.contracts';
export class CreateProductUseCase {
  constructor(private readonly repository: ProductRepositoryPort) {}
  async execute(input: CreateProductInput): Promise<ProductData> {
    const product = Product.create(this.repository.nextId(), input);
    return (await this.repository.create(product)).toData();
  }
}
