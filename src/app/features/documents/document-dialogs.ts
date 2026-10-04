import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import type { Document } from '../../core/api/types';
import { centsToInput, parseToCents } from '../../core/format/money';
import { TPipe } from '../../core/i18n/t.pipe';
import { injectDialog } from '../../shared/dialog';
import { Notify } from '../../shared/notify';
import { DocumentsApi } from './documents.api';

/** `B001-00000012`: series and number padded to 8 digits, as printed on the comprobante. */
export function documentNumber(d: Pick<Document, 'series' | 'number'>): string {
  return `${d.series}-${String(d.number).padStart(8, '0')}`;
}

@Component({
  selector: 'app-void-document-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    HlmButtonImports,
    HlmDialogImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ 'documents.void.title' | t: { number: number } }}</h2>
        <p hlmDialogDescription>{{ 'documents.void.warning' | t }}</p>
      </hlm-dialog-header>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'documents.void.reason' | t }}</span>
        <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
        }
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" variant="destructive" [disabled]="busy()">
          {{ 'documents.void' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class VoidDocumentDialog {
  protected readonly dialog = injectDialog<{ document: Document }, boolean>();
  private readonly api = inject(DocumentsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly number = documentNumber(this.dialog.context.document);
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({ reason: ['', Validators.required] });

  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.void(this.dialog.context.document.id, this.form.controls.reason.value.trim());
      this.notify.success('documents.void.done');
      this.dialog.close(true);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-credit-note-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header
        ><h2 hlmDialogTitle>
          {{ 'documents.creditNote.title' | t: { number: number } }}
        </h2></hlm-dialog-header
      >
      <label class="grid gap-1.5">
        <span hlmLabel>{{
          'documents.creditNote.amount' | t: { currency: document.currency }
        }}</span>
        <input hlmInput inputmode="decimal" formControlName="amount" />
        @if (form.controls.amount.touched && amountCents() === null) {
          <span class="text-xs text-destructive">{{
            'documents.creditNote.invalidAmount' | t
          }}</span>
        }
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'documents.creditNote.reason' | t }}</span>
        <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
        }
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy()">{{ 'documents.creditNote' | t }}</button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class CreditNoteDialog {
  protected readonly dialog = injectDialog<{ document: Document }, boolean>();
  private readonly api = inject(DocumentsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly document = this.dialog.context.document;
  protected readonly number = documentNumber(this.document);
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({
    amount: [centsToInput(this.document.totalCents)],
    reason: ['', Validators.required],
  });

  protected amountCents(): number | null {
    const c = parseToCents(this.form.controls.amount.value);
    return c !== null && c >= 1 && c <= this.document.totalCents ? c : null;
  }

  protected async submit() {
    this.form.markAllAsTouched();
    const amountCents = this.amountCents();
    if (amountCents === null || this.form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.creditNote(this.document.id, {
        amountCents,
        reason: this.form.controls.reason.value.trim(),
      });
      this.notify.success('documents.creditNote.done');
      this.dialog.close(true);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
