import type { AbstractControl, ValidationErrors } from '@angular/forms';

/** Seats and party sizes are whole numbers; `type=number` alone lets `1.5` through. */
export function wholeNumber(c: AbstractControl): ValidationErrors | null {
  return c.value === null || c.value === '' || Number.isInteger(c.value) ? null : { integer: true };
}
