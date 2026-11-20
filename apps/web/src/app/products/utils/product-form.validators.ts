import { AbstractControl, ValidationErrors } from '@angular/forms';
import { parsePrice } from '../money';

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
