import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PRODUCT_REPOSITORY_PORT } from './domain/ports/product.repository.port';
import { CreateProductHandler } from './application/commands/create-product/create-product.handler';
import { UpdateProductHandler } from './application/commands/update-product/update-product.handler';
import { DeleteProductHandler } from './application/commands/delete-product/delete-product.handler';
import { GetProductHandler } from './application/queries/get-product/get-product.handler';
import { ListProductsHandler } from './application/queries/list-products/list-products.handler';
import { MongooseProductRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-product.repository';
import { PRODUCT_MODEL, ProductSchema } from './infrastructure/persistence/mongoose/schemas/product.schema';
import { ProductsController } from './infrastructure/http/controllers/products.controller';
const handlers = [CreateProductHandler, UpdateProductHandler, DeleteProductHandler, GetProductHandler, ListProductsHandler];
@Module({ imports: [MongooseModule.forFeature([{ name: PRODUCT_MODEL, schema: ProductSchema }])], controllers: [ProductsController], providers: [
  { provide: PRODUCT_REPOSITORY_PORT, useClass: MongooseProductRepository }, ...handlers,
] })
export class ProductsModule {}
