import { ListProductsInput } from '../../dto/product.contracts';
export class ListProductsQuery {
  constructor(public readonly input: ListProductsInput = {}) {}
}
