import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { Product } from '../../models/product.models';
import { ProductsComponent } from './products.component';
import { productFilters } from '../../store/product-filters.store';
const product: Product = {
  id: '0123456789abcdef01234567',
  name: 'Organic Seed',
  priceMinor: 1299,
  stock: 3,
  category: 'Seeds',
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: '2026-11-19T00:00:00Z',
};
describe('catalog CRUD and server-side page interactions', () => {
  let http: HttpTestingController;
  const params = new BehaviorSubject(convertToParamMap({}));
  beforeEach(() => {
    params.next(convertToParamMap({}));
    HTMLDialogElement.prototype.showModal = vi.fn();
    TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
        provideStore({ [productFilters.name]: productFilters.reducer }),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { user: signal({ email: 'demo@example.test' }), logout: () => of(undefined) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });
  function setup() {
    const fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    const request = http.expectOne((r) => r.url === '/products');
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.has('category')).toBe(false);
    expect(request.request.params.has('search')).toBe(false);
    request.flush({
      itemCount: 1,
      filters: { search: null, category: null, sortBy: 'createdAt', sortDirection: 'desc' },
      items: [product],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    fixture.detectChanges();
    return fixture;
  }
  function flushList() {
    http
      .expectOne((r) => r.url === '/products' && r.method === 'GET')
      .flush({
        itemCount: 1,
        filters: { search: null, category: null, sortBy: 'createdAt', sortDirection: 'desc' },
        items: [product],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
  }
  it('renders API values as safe text and prices with exact minor units', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Organic Seed');
    expect(text).toContain('12.99');
    expect(text).toContain('Seeds');
  });
  it('creates a product and reloads the current server page', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.create();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-product-editor'),
    ).not.toBeNull();
    c.save({ name: 'New', priceMinor: 0, stock: 1 });
    const post = http.expectOne('/products');
    expect(post.request.method).toBe('POST');
    post.flush({ ...product, name: 'New' });
    flushList();
    expect(c.editorOpen()).toBe(false);
    expect(c.toast()).toContain('creado');
  });
  it('keeps confirmation compact, dismisses it after four seconds and cleans up its timer', () => {
    vi.useFakeTimers();
    const fixture = setup();
    const c = fixture.componentInstance;
    c.save({ name: 'New', priceMinor: 1, stock: 1 });
    http.expectOne('/products').flush({ ...product, name: 'New' });
    flushList();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.workspace-guidance')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.overview-row')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notice.success')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Pequeños hábitos');
    vi.advanceTimersByTime(3999);
    expect(c.toast()).toContain('creado');
    vi.advanceTimersByTime(1);
    expect(c.toast()).toBe('');
    c.save({ name: 'Again', priceMinor: 1, stock: 1 });
    http.expectOne('/products').flush(product);
    flushList();
    fixture.destroy();
    expect(c.toast()).toBe('');
  });
  it('resets the toast lifetime on another success and allows manual dismissal', () => {
    vi.useFakeTimers();
    const fixture = setup();
    const c = fixture.componentInstance;
    c.save({ name: 'First', priceMinor: 1, stock: 1 });
    http.expectOne('/products').flush(product);
    flushList();
    vi.advanceTimersByTime(3000);
    c.save({ name: 'Second', priceMinor: 1, stock: 1 });
    http.expectOne('/products').flush(product);
    flushList();
    vi.advanceTimersByTime(1000);
    expect(c.toast()).toContain('creado');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Cerrar mensaje"]')!
      .click();
    expect(c.toast()).toBe('');
    vi.advanceTimersByTime(4000);
    expect(c.toast()).toBe('');
  });
  it('updates a product using its actual endpoint and preserves integer payloads', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.edit(product);
    c.save({ name: 'Changed', priceMinor: 1999, stock: 0, category: '' });
    const patch = http.expectOne('/products/' + product.id);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body.priceMinor).toBe(1999);
    patch.flush({ ...product, name: 'Changed' });
    flushList();
    expect(c.toast()).toContain('actualizado');
  });
  it('does not delete before confirmation, then handles204 and refreshes', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.confirmDelete(product);
    fixture.detectChanges();
    http.expectNone('/products/' + product.id);
    c.remove();
    const del = http.expectOne('/products/' + product.id);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    flushList();
    expect(c.deleting()).toBeNull();
    expect(c.toast()).toContain('eliminado');
  });
  it('keeps the editor and displays friendly errors when saving fails', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.create();
    c.save({ name: 'New', priceMinor: 1, stock: 1 });
    http.expectOne('/products').flush({}, { status: 400, statusText: 'Bad Request' });
    expect(c.editorOpen()).toBe(true);
    expect(c.mutationBusy()).toBe(false);
    expect(c.mutationError()).toContain('Revisa');
  });
  it('loads URL filters through NgRx and uses bounded backend parameters', () => {
    const fixture = setup();
    params.next(
      convertToParamMap({
        page: '2',
        pageSize: '10',
        category: 'Seeds',
        search: 'Organic',
        sortBy: 'priceMinor',
        sortDirection: 'asc',
      }),
    );
    const request = http.expectOne((r) => r.url === '/products');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('category')).toBe('Seeds');
    request.flush({
      itemCount: 1,
      filters: { search: 'Organic', category: 'Seeds', sortBy: 'priceMinor', sortDirection: 'asc' },
      items: [product],
      total: 11,
      page: 2,
      pageSize: 10,
      totalPages: 2,
    });
    expect(fixture.componentInstance.filters().page).toBe(2);
    expect(fixture.componentInstance.data().itemCount).toBe(1);
    expect(fixture.componentInstance.data().filters).toEqual({
      search: 'Organic',
      category: 'Seeds',
      sortBy: 'priceMinor',
      sortDirection: 'asc',
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 de 11 productos');
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(/Página\s+2 de 2/);
  });
  it('shows an empty state and an error state with retry', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.refresh();
    http
      .expectOne((r) => r.url === '/products')
      .flush({
        itemCount: 0,
        filters: { search: null, category: null, sortBy: 'createdAt', sortDirection: 'desc' },
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu catálogo empieza aquí',
    );
    c.refresh();
    http.expectOne((r) => r.url === '/products').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Intentar de nuevo');
  });
});
