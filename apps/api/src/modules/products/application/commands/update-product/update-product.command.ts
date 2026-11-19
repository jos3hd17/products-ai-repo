import { UpdateProductInput } from '../../dto/product.contracts';
export class UpdateProductCommand {
  constructor(public readonly id: string, public readonly input: UpdateProductInput) {}
}
