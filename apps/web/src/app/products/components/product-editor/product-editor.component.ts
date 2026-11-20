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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, ProductWrite } from '../../models/product.models';
import { decimalPrice, parsePrice } from '../../utils/money.util';
import {
  nameValidator,
  priceValidator,
  stockValidator,
} from '../../validators/product-form.validators';
@Component({
  selector: 'app-product-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './product-editor.component.html',
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
