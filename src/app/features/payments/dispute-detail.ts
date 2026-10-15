import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { ApiError } from '../../core/api/api-error';
import type { DisputeStatus } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { saveBlob } from '../../shared/download';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { DISPUTE_STATUSES, evidenceUrgency } from './disputes-page';
import { PaymentsApi } from './payments.api';

@Component({
  selector: 'app-dispute-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTextareaImports,
  ],
  template: `
    <div class="space-y-6">
      <a hlmBtn variant="ghost" size="sm" routerLink="/disputes">← {{ 'disputes.title' | t }}</a>
      @if (notFound()) {
        <p class="text-muted-foreground">{{ 'disputes.detail.notFound' | t }}</p>
      } @else if (dispute.error()) {
        <button hlmBtn size="sm" variant="outline" (click)="dispute.reload()">
          {{ 'common.retry' | t }}
        </button>
      } @else if (dispute.value(); as d) {
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold">{{ d.amountCents | money: d.currency }}</h1>
            <p class="text-sm text-muted-foreground">
              {{ d.provider | enumLabel: 'enum.provider' }} · {{ d.providerRef }} ·
              {{ d.reason || '—' }}
            </p>
          </div>
          <div class="text-right text-sm">
            <p class="text-muted-foreground">{{ 'disputes.col.due' | t }}</p>
            <p class="font-medium">{{ d.evidenceDueAt | limaDateTime }}</p>
          </div>
        </header>

        @if (urgency(); as u) {
          <p
            class="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
            role="alert"
          >
            {{
              u === 'overdue' ? ('disputes.detail.overdue' | t) : ('disputes.detail.dueSoon' | t)
            }}
          </p>
        }

        <section hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle>{{ 'disputes.detail.evidence' | t }}</h2>
            <p hlmCardDescription>{{ 'disputes.detail.evidenceHint' | t }}</p>
          </div>
          <div hlmCardContent>
            <button
              hlmBtn
              variant="outline"
              [disabled]="downloading()"
              (click)="downloadEvidence(d.id)"
            >
              {{ 'disputes.detail.evidence' | t }}
            </button>
          </div>
        </section>

        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="grid gap-4 rounded-lg border border-border p-4 sm:max-w-xl"
        >
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'disputes.detail.status' | t }}</span>
            <select hlmInput formControlName="status">
              @for (s of statuses; track s) {
                <option [value]="s">{{ s | enumLabel: 'dispute.status' }}</option>
              }
            </select>
          </label>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'disputes.detail.notes' | t }}</span>
            <textarea hlmTextarea rows="4" formControlName="notes"></textarea>
          </label>
          <div *appHasPermission="'payments:write'" class="flex justify-end">
            <button hlmBtn type="submit" [disabled]="saving() || form.pristine">
              {{ 'common.save' | t }}
            </button>
          </div>
        </form>
      } @else {
        <hlm-skeleton class="h-40" />
      }
    </div>
  `,
})
export class DisputeDetail {
  readonly id = input.required<string>();
  private readonly api = inject(PaymentsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly statuses = DISPUTE_STATUSES;
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);

  protected readonly dispute = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getDispute(params),
  });
  protected readonly notFound = computed(
    () =>
      this.dispute.error() instanceof ApiError &&
      (this.dispute.error() as ApiError).statusCode === 404,
  );
  protected readonly urgency = computed(() => {
    const d = this.dispute.value();
    return d ? evidenceUrgency(d.status, d.evidenceDueAt) : null;
  });
  protected readonly form = this.fb.group({ status: ['OPEN' as DisputeStatus], notes: [''] });

  constructor() {
    effect(() => {
      const d = this.dispute.value();
      if (d) this.form.reset({ status: d.status, notes: d.notes ?? '' });
    });
  }

  protected async save() {
    this.saving.set(true);
    try {
      await this.api.updateDispute(this.id(), this.form.getRawValue());
      this.notify.success('disputes.detail.saved');
      this.dispute.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async downloadEvidence(id: string) {
    this.downloading.set(true);
    try {
      saveBlob(await this.api.evidence(id), `dispute-${id}-evidence.zip`);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.downloading.set(false);
    }
  }
}
