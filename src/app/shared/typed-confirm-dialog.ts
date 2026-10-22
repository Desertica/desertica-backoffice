import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { TPipe } from '../core/i18n/t.pipe';
import { injectDialog } from './dialog';

/** True when the typed text equals one of the accepted words (case and outer spaces ignored). */
export function matchesConfirmation(input: string, accepted: readonly string[]): boolean {
  const typed = input.trim().toUpperCase();
  return typed !== '' && accepted.some((a) => a.trim().toUpperCase() === typed);
}

/** Irreversible action guard: the confirm button unlocks only after typing one of `accepted`. */
@Component({
  selector: 'app-typed-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TPipe, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (ngSubmit)="confirm()" class="grid gap-4">
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ dialog.context.title }}</h2>
        <p hlmDialogDescription>{{ dialog.context.description }}</p>
      </hlm-dialog-header>
      <label class="grid gap-1.5 text-sm">
        <span>{{ 'typedConfirm.hint' | t: { value: dialog.context.accepted.join(' / ') } }}</span>
        <input
          hlmInput
          name="typed"
          autocomplete="off"
          [ngModel]="typed()"
          (ngModelChange)="typed.set($event)"
        />
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close(false)">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" variant="destructive" [disabled]="!matches()">
          {{ 'common.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class TypedConfirmDialog {
  protected readonly dialog = injectDialog<
    { title: string; description: string; accepted: readonly string[] },
    boolean
  >();
  protected readonly typed = signal('');

  protected matches() {
    return matchesConfirmation(this.typed(), this.dialog.context.accepted);
  }

  protected confirm() {
    if (this.matches()) this.dialog.close(true);
  }
}
