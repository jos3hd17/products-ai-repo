import { CreateProductInput } from '../../dto/product.contracts';
export class CreateProductCommand {
  constructor(public readonly input: CreateProductInput) {}
}
