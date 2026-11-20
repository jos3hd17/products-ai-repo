import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProductEditorComponent } from './product-editor.component';
import { Product } from '../../models/product.models';
const product: Product = {
  id: '0123456789abcdef01234567',
  name: 'Seed',
  priceMinor: 1250,
  stock: 2,
  category: 'Seeds',
  description: 'Old description',
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: '2026-11-19T00:00:00Z',
};
describe('strictly typed product form', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    TestBed.configureTestingModule({ imports: [ProductEditorComponent] });
  });
  it('does not emit invalid/blank/unsafe values', () => {
    const fixture = TestBed.createComponent(ProductEditorComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.form.setValue({ name: '   ', price: '-1', stock: '1.5', description: '', category: '' });
    c.submit();
    expect(saved).not.toHaveBeenCalled();
    expect(c.form.controls.name.touched).toBe(true);
    c.form.patchValue({ name: 'Seed', price: '90071992547409.92', stock: '0' });
    c.submit();
    expect(saved).not.toHaveBeenCalled();
  });
  it('submits exact minor units and omits empty optional create fields', () => {
    const fixture = TestBed.createComponent(ProductEditorComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.form.setValue({ name: ' Seed ', price: '12.50', stock: '0', description: '', category: '' });
    c.submit();
    expect(saved).toHaveBeenCalledWith({ name: 'Seed', priceMinor: 1250, stock: 0 });
  });
  it('prepopulates edit values and supports clearing optional fields', () => {
    const fixture = TestBed.createComponent(ProductEditorComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.form.controls.price.value).toBe('12.50');
    c.form.patchValue({ description: '', category: '' });
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.submit();
    expect(saved).toHaveBeenCalledWith({
      name: 'Seed',
      priceMinor: 1250,
      stock: 2,
      description: '',
      category: '',
    });
  });
  it('prevents cancellation and duplicate submit during save', () => {
    const fixture = TestBed.createComponent(ProductEditorComponent);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const closed = vi.fn();
    const saved = vi.fn();
    c.closed.subscribe(closed);
    c.saved.subscribe(saved);
    c.cancel(new Event('cancel'));
    c.submit();
    expect(closed).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });
});
