import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Product, ProductFilters, ProductPage, ProductWrite, SortField } from '../core/models';
import { friendlyError } from '../core/friendly-error';
import { ConfirmDeleteComponent } from '../shared/confirm-delete.component';
import {
  DEFAULT_FILTERS,
  filtersReplaced,
  filtersToParams,
  parseFilters,
  productFilters,
} from './product-filters';
import { ProductsApi } from './products-api.service';
import { ProductEditorComponent } from './product-editor.component';
import { displayPrice } from './money';
@Component({
  selector: 'app-products',
  imports: [
    ReactiveFormsModule,
    ProductEditorComponent,
    ConfirmDeleteComponent,
  ],
  templateUrl: './products.component.html',
})
export class ProductsComponent {
  private readonly api = inject(ProductsApi);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reload = new Subject<void>();
  readonly filters = this.store.selectSignal(productFilters.selectProductFiltersState);
  readonly data = signal<ProductPage>({
    itemCount: 0,
    filters: { search: null, category: null, sortBy: 'createdAt', sortDirection: 'desc' },
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  readonly signingOut = signal(false);
  readonly editorOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly deleting = signal<Product | null>(null);
  readonly mutationBusy = signal(false);
  readonly mutationError = signal('');
  readonly displayPrice = displayPrice;
  readonly form = this.fb.group({
    search: ['', [Validators.maxLength(120)]],
    category: ['', [Validators.maxLength(80)]],
    pageSize: [20],
    sortBy: ['createdAt' as SortField],
    sortDirection: ['desc' as 'asc' | 'desc'],
  });
  constructor() {
    this.destroy.onDestroy(() => this.dismissToast());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const filters = parseFilters(params);
      this.store.dispatch(filtersReplaced({ filters }));
      this.form.patchValue(filters, { emitEvent: false });
    });
    this.form.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (this.form.valid) this.setFilters({ ...this.form.getRawValue(), page: 1 });
      });
    combineLatest([
      this.store
        .select(productFilters.selectProductFiltersState)
        .pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      this.reload.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([filters]) =>
          this.api.list(filters).pipe(
            map((data) => ({ data, error: '', loading: false })),
            catchError((error) => of({ data: null, error: friendlyError(error), loading: false })),
            startWith({ data: null, error: '', loading: true }),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((state) => {
        this.loading.set(state.loading);
        this.error.set(state.error);
        if (state.data) {
          this.data.set(state.data);
          if (!state.data.items.length && state.data.page > 1)
            this.setFilters({
              page: Math.max(1, Math.min(state.data.totalPages, 10000)),
            });
        }
      });
  }
  setFilters(patch: Partial<ProductFilters>): void {
    if (this.signingOut()) return;
    const filters = { ...this.filters(), ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(filters),
    });
  }
  clearFilters(): void {
    this.setFilters({ ...DEFAULT_FILTERS });
  }
  refresh(): void {
    this.reload.next();
  }
  create(): void {
    this.editing.set(null);
    this.mutationError.set('');
    this.editorOpen.set(true);
  }
  edit(product: Product): void {
    this.editing.set(product);
    this.mutationError.set('');
    this.editorOpen.set(true);
  }
  confirmDelete(product: Product): void {
    this.mutationError.set('');
    this.deleting.set(product);
  }
  save(input: ProductWrite): void {
    if (this.mutationBusy()) return;
    const product = this.editing();
    this.mutationBusy.set(true);
    this.mutationError.set('');
    (product ? this.api.update(product.id, input) : this.api.create(input))
      .pipe(
        finalize(() => this.mutationBusy.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.editorOpen.set(false);
          this.showToast(product ? 'Producto actualizado.' : 'Producto creado.');
          this.refresh();
        },
        error: (e) => this.mutationError.set(friendlyError(e)),
      });
  }
  remove(): void {
    const product = this.deleting();
    if (!product || this.mutationBusy()) return;
    this.mutationBusy.set(true);
    this.mutationError.set('');
    this.api
      .delete(product.id)
      .pipe(
        finalize(() => this.mutationBusy.set(false)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.showToast('Producto eliminado.');
          this.refresh();
        },
        error: (e) => this.mutationError.set(friendlyError(e)),
      });
  }
  private showToast(message: string): void {
    this.dismissToast();
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.dismissToast(), 4000);
  }
  dismissToast(): void {
    if (this.toastTimer !== undefined) clearTimeout(this.toastTimer);
    this.toastTimer = undefined;
    this.toast.set('');
  }
  logout(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        void this.router.navigate(['/login'], { queryParams: { logout: 'unconfirmed' } });
      },
    });
  }
  page(delta: number): void {
    const page = this.data().page + delta;
    if (page >= 1 && page <= Math.min(this.data().totalPages, 10000)) this.setFilters({ page });
  }
}
