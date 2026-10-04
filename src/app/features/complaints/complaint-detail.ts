import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { ApiError } from '../../core/api/api-error';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { ComplaintsApi } from './complaints.api';
import { dueState } from './complaints-page';

@Component({
  selector: 'app-complaint-detail',
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
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTextareaImports,
  ],
  template: `
    <div class="mx-auto max-w-3xl space-y-6">
      <a hlmBtn variant="ghost" size="sm" routerLink="/complaints"
        >← {{ 'complaints.title' | t }}</a
      >
      @if (notFound()) {
        <p class="text-muted-foreground">{{ 'complaints.detail.notFound' | t }}</p>
      } @else if (complaint.error()) {
        <button hlmBtn size="sm" variant="outline" (click)="complaint.reload()">
          {{ 'common.retry' | t }}
        </button>
      } @else if (complaint.value(); as c) {
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold">
              #{{ c.id }} · {{ c.kind | enumLabel: 'complaints.kind' }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ c.createdAt | limaDateTime }} · {{ c.status | enumLabel: 'complaints.status' }}
              @if (due(); as d) {
                ·
                <span class="font-medium text-destructive">{{
                  d === 'overdue' ? ('complaints.due.overdue' | t) : ('complaints.due.soon' | t)
                }}</span>
              }
            </p>
          </div>
          <div class="text-right text-sm">
            <p class="text-muted-foreground">{{ 'complaints.col.due' | t }}</p>
            <p class="font-medium">{{ c.dueAt | limaDateTime: 'date' }}</p>
          </div>
        </header>

        <dl class="grid gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground">{{ 'complaints.detail.consumer' | t }}</dt>
            <dd class="font-medium">
              {{ c.consumerName }}
              @if (c.isMinor) {
                ({{ 'complaints.detail.minor' | t }})
              }
            </dd>
            <dd>{{ c.idDocType | enumLabel: 'enum.idDocType' }} {{ c.idDocNumber }}</dd>
            <dd>{{ c.email }} {{ c.phone }}</dd>
            <dd>{{ c.address }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ 'complaints.detail.good' | t }}</dt>
            <dd class="font-medium">{{ c.goodType | enumLabel: 'complaints.good' }}</dd>
            @if (c.bookingRef) {
              <dd>{{ 'complaints.detail.booking' | t: { reference: c.bookingRef } }}</dd>
            }
            @if (c.amountCents && c.currency) {
              <dd>{{ 'complaints.detail.amount' | t }}: {{ c.amountCents | money: c.currency }}</dd>
            }
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground">{{ 'complaints.detail.description' | t }}</dt>
            <dd class="whitespace-pre-line">{{ c.description }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground">{{ 'complaints.detail.detail' | t }}</dt>
            <dd class="whitespace-pre-line">{{ c.detail }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground">{{ 'complaints.detail.request' | t }}</dt>
            <dd class="whitespace-pre-line">{{ c.request }}</dd>
          </div>
        </dl>

        @if (c.status === 'ANSWERED') {
          <section class="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <h2 class="font-medium">{{ 'complaints.detail.answer' | t }}</h2>
            <p class="whitespace-pre-line">{{ c.answer }}</p>
            @if (c.answeredAt) {
              <p class="text-xs text-muted-foreground">
                {{ 'complaints.detail.answeredAt' | t: { date: (c.answeredAt | limaDateTime) } }}
              </p>
            }
          </section>
        } @else {
          <form
            *appHasPermission="'complaints:write'"
            [formGroup]="form"
            (ngSubmit)="send()"
            class="grid gap-3"
            novalidate
          >
            <label class="grid gap-1.5">
              <span hlmLabel>{{ 'complaints.answer.label' | t }}</span>
              <textarea hlmTextarea rows="6" formControlName="answer"></textarea>
              <span class="text-xs text-muted-foreground">{{ 'complaints.answer.hint' | t }}</span>
              @if (form.controls.answer.touched && form.controls.answer.invalid) {
                <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
              }
            </label>
            <div class="flex justify-end">
              <button hlmBtn type="submit" [disabled]="saving()">
                {{ 'complaints.answer.send' | t }}
              </button>
            </div>
          </form>
        }
      } @else {
        <hlm-skeleton class="h-48" />
      }
    </div>
  `,
})
export class ComplaintDetail {
  /** Route params arrive as strings; complaint ids are integers. */
  readonly id = input.required<string>();
  private readonly api = inject(ComplaintsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly saving = signal(false);
  protected readonly form = this.fb.group({
    answer: ['', [Validators.required, Validators.minLength(1)]],
  });

  protected readonly complaint = resource({
    params: () => Number(this.id()),
    loader: ({ params }) => this.api.get(params),
  });
  protected readonly notFound = computed(
    () =>
      this.complaint.error() instanceof ApiError &&
      (this.complaint.error() as ApiError).statusCode === 404,
  );
  protected readonly due = computed(() => {
    const c = this.complaint.value();
    return c ? dueState(c.status, c.dueAt) : null;
  });

  protected async send() {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.controls.answer.value.trim()) return;
    this.saving.set(true);
    try {
      await this.api.answer(Number(this.id()), this.form.controls.answer.value.trim());
      this.notify.success('complaints.answer.done');
      this.complaint.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }
}
