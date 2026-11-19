import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Product, ProductWrite } from '../core/models';
import { decimalPrice, parsePrice } from './money';
export function priceValidator(control: AbstractControl): ValidationErrors | null {
  return parsePrice(String(control.value)) === null ? { price: true } : null;
}
export function stockValidator(control: AbstractControl): ValidationErrors | null {
  const s = String(control.value).trim();
  return /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) ? null : { stock: true };
}
export function nameValidator(control: AbstractControl): ValidationErrors | null {
  return String(control.value).trim() ? null : { required: true };
}
@Component({
  selector: 'app-product-editor',
  imports: [ReactiveFormsModule],
  template: ` <dialog
    #dialog
    class="editor-dialog"
    (cancel)="cancel($event)"
    aria-labelledby="editor-title"
  >
    <header class="dialog-header">
      <div>
        <p class="eyebrow">CATÁLOGO</p>
        <h2 id="editor-title">{{ product() ? 'Editar producto' : 'Nuevo producto' }}</h2>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="Cerrar formulario"
        (click)="closed.emit()"
        [disabled]="busy()"
      >
        ✕
      </button>
    </header>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (error()) {
        <div class="notice error" role="alert">{{ error() }}</div>
      }
      <label for="product-name">Nombre del producto <span aria-hidden="true">*</span></label
      ><input
        id="product-name"
        autofocus
        formControlName="name"
        maxlength="120"
        placeholder="Ej. Semilla de maíz"
        [attr.aria-invalid]="invalid('name')"
        aria-describedby="name-error"
      />
      @if (invalid('name')) {
        <small id="name-error" class="field-error"
          >Escribe un nombre de hasta 120 caracteres.</small
        >
      }
      <div class="form-grid">
        <div>
          <label for="product-price">Precio <span aria-hidden="true">*</span></label
          ><input
            id="product-price"
            formControlName="price"
            inputmode="decimal"
            placeholder="0.00"
            maxlength="24"
            [attr.aria-invalid]="invalid('price')"
            aria-describedby="price-hint"
          /><small id="price-hint" [class.field-error]="invalid('price')">{{
            invalid('price')
              ? 'Ingresa un precio válido, sin negativos y con máximo dos decimales.'
              : 'Usa punto para los decimales. Ejemplo: 12.50'
          }}</small>
        </div>
        <div>
          <label for="product-stock">Existencias <span aria-hidden="true">*</span></label
          ><input
            id="product-stock"
            formControlName="stock"
            inputmode="numeric"
            maxlength="16"
            [attr.aria-invalid]="invalid('stock')"
            aria-describedby="stock-error"
          />
          @if (invalid('stock')) {
            <small id="stock-error" class="field-error">Ingresa un número entero desde cero.</small>
          }
        </div>
      </div>
      <label for="product-category">Categoría <span class="optional">opcional</span></label
      ><input
        id="product-category"
        formControlName="category"
        maxlength="80"
        placeholder="Ej. Semillas"
      />
      <label for="product-description">Descripción <span class="optional">opcional</span></label
      ><textarea
        id="product-description"
        formControlName="description"
        rows="3"
        maxlength="2000"
        placeholder="Lo esencial para identificar este producto"
      ></textarea>
      <footer class="dialog-footer">
        <button class="button secondary" type="button" (click)="closed.emit()" [disabled]="busy()">
          Cancelar</button
        ><button class="button primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Guardando…' : product() ? 'Guardar cambios' : 'Crear producto' }}
        </button>
      </footer>
    </form>
  </dialog>`,
})
export class ProductEditorComponent implements AfterViewInit {
  readonly product = input<Product | null>(null);
  readonly busy = input(false);
  readonly error = input('');
  readonly saved = output<ProductWrite>();
  readonly closed = output<void>();
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    name: ['', [nameValidator, Validators.maxLength(120)]],
    price: ['', [priceValidator]],
    stock: ['0', [stockValidator]],
    category: ['', [Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(2000)]],
  });
  constructor() {
    effect(() => {
      const item = this.product();
      this.form.reset({
        name: item?.name ?? '',
        price: item ? decimalPrice(item.priceMinor) : '',
        stock: String(item?.stock ?? 0),
        category: item?.category ?? '',
        description: item?.description ?? '',
      });
    });
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal?.();
  }
  cancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  invalid(key: keyof typeof this.form.controls): boolean {
    return this.form.controls[key].touched && this.form.controls[key].invalid;
  }
  submit(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const priceMinor = parsePrice(value.price);
    if (priceMinor === null) return;
    const result: ProductWrite = {
      name: value.name.trim(),
      priceMinor,
      stock: Number(value.stock.trim()),
    };
    if (this.product() || value.category.trim()) result.category = value.category.trim();
    if (this.product() || value.description.trim()) result.description = value.description.trim();
    this.saved.emit(result);
  }
}
