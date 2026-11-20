import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api-config';
import { Product, ProductFilters, ProductPage, ProductWrite } from '../models/product.models';
@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_BASE_URL) + '/products';
  list(filters: ProductFilters) {
    const { search, category, ...required } = filters;
    return this.http.get<ProductPage>(this.url, {
      params: { ...required, ...(search ? { search } : {}), ...(category ? { category } : {}) },
    });
  }
  create(input: ProductWrite) {
    return this.http.post<Product>(this.url, input);
  }
  update(id: string, input: ProductWrite) {
    return this.http.patch<Product>(`${this.url}/${encodeURIComponent(id)}`, input);
  }
  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`);
  }
}
