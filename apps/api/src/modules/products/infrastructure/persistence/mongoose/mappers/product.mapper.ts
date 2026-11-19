import { Product } from '../../../../domain/entities/product';
import { ProductRecord } from '../schemas/product.schema';
import { Types } from 'mongoose';
export class ProductMapper {
  static toDomain(record: ProductRecord): Product {
    return Product.restore({ id: record._id.toHexString(), name: record.name, priceMinor: record.priceMinor, stock: record.stock,
      ...(record.description !== undefined ? { description: record.description } : {}), ...(record.category !== undefined ? { category: record.category } : {}), createdAt: record.createdAt, updatedAt: record.updatedAt });
  }
  static toPersistence(product: Product): ProductRecord { const { id, ...data } = product.toData(); return { ...data, _id: new Types.ObjectId(id) }; }
}
