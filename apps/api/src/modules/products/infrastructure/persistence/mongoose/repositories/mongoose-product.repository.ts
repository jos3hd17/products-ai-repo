import { withPersistenceErrors } from '../../../../../../shared/infrastructure/persistence/with-persistence-errors';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Product, ProductPatch } from '../../../../domain/entities/product';
import { ProductPage, ProductQuery, ProductRepositoryPort } from '../../../../domain/ports/product.repository.port';
import { PRODUCT_MODEL, ProductRecord } from '../schemas/product.schema';
import { ProductMapper } from '../mappers/product.mapper';
export function literalSearchPattern(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
@Injectable()
export class MongooseProductRepository implements ProductRepositoryPort {
    constructor(
    @InjectModel(PRODUCT_MODEL)
    private readonly model: Model<ProductRecord>) { }
    nextId(): string { return new Types.ObjectId().toHexString(); }
    async create(product: Product): Promise<Product> {
        return withPersistenceErrors(async () => {
            const saved = await this.model.create(ProductMapper.toPersistence(product));
            return ProductMapper.toDomain(saved.toObject());
        });
    }
    async findById(id: string): Promise<Product | null> {
        return withPersistenceErrors(async () => {
            Product.assertId(id);
            const record = await this.model.findById(id).lean<ProductRecord>().exec();
            return record ? ProductMapper.toDomain(record) : null;
        });
    }
    async list(query: ProductQuery): Promise<ProductPage> {
        return withPersistenceErrors(async () => {
            const filter: {
                name?: {
                    $regex: string;
                    $options: string;
                };
                category?: string;
            } = {};
            if (query.search)
                filter.name = { $regex: literalSearchPattern(query.search), $options: 'i' };
            if (query.category !== undefined)
                filter.category = query.category;
            const direction = query.sortDirection === 'asc' ? 1 : -1;
            const [records, total] = await Promise.all([
                this.model.find(filter).sort({ [query.sortBy]: direction, _id: direction }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean<ProductRecord[]>().exec(), this.model.countDocuments(filter).exec(),
            ]);
            return { items: records.map(record => ProductMapper.toDomain(record)), total };
        });
    }
    async update(id: string, changes: ProductPatch): Promise<Product | null> {
        return withPersistenceErrors(async () => {
            Product.assertId(id);
            const valid = Product.validateChanges(changes);
            const record = await this.model.findByIdAndUpdate(id, { $set: valid }, { new: true, runValidators: true }).lean<ProductRecord>().exec();
            return record ? ProductMapper.toDomain(record) : null;
        });
    }
    async delete(id: string): Promise<boolean> {
        return withPersistenceErrors(async () => {
            Product.assertId(id);
            return (await this.model.deleteOne({ _id: id }).exec()).deletedCount === 1;
        });
    }
}
