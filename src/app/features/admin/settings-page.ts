import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import type { LegalDocumentKind, LegalDocumentWithText } from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import type { MessageKey } from '../../core/i18n/messages.es';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { AdminApi } from './admin.api';
import {
  SETTING_FIELDS,
  type SettingKey,
  type SettingsForm,
  toForm,
  toInput,
} from './settings-model';

const LEGAL_KINDS: readonly Exclude<LegalDocumentKind, 'WAIVER'>[] = [
  'TERMS',
  'PRIVACY',
  'CANCELLATION',
  'COOKIES',
  'CONDUCT',
];

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmTextareaImports,
  ],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly fields = SETTING_FIELDS;
  protected readonly legalKinds = LEGAL_KINDS;

  protected readonly settings = resource({ loader: () => this.api.getSettings() });
  protected readonly blocked = resource({ loader: () => this.api.listBlocked() });
  protected readonly form = signal<SettingsForm>(toForm({}));
  private loaded = toForm({});
  protected readonly fieldError = signal<{ key: SettingKey; message: MessageKey } | null>(null);
  protected readonly saving = signal(false);

  protected readonly blockForm = this.fb.group({
    kind: ['EMAIL' as 'EMAIL' | 'IP'],
    value: ['', Validators.required],
    reason: [''],
  });
  protected readonly legalForm = this.fb.group({
    kind: ['TERMS' as Exclude<LegalDocumentKind, 'WAIVER'>],
    locale: ['es', Validators.required],
    title: ['', Validators.required],
    text: ['', Validators.required],
  });
  /** The version in force for the chosen document and language; the editor starts from its text. */
  protected readonly legalCurrent = signal<LegalDocumentWithText | null>(null);
  protected readonly publishing = signal(false);

  constructor() {
    this.loadCurrentLegal();
    this.legalForm.controls.kind.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.loadCurrentLegal());
    this.legalForm.controls.locale.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.loadCurrentLegal());
    effect(() => {
      const s = this.settings.value();
      if (!s) return;
      this.loaded = toForm(s);
      this.form.set(this.loaded);
      this.fieldError.set(null);
    });
  }

  protected setField(key: SettingKey, text: string) {
    this.form.update((f) => ({ ...f, [key]: text }));
    this.fieldError.set(null);
  }

  protected async save() {
    const result = toInput(this.form(), this.loaded);
    if ('error' in result) {
      const message: MessageKey =
        result.error === 'invalidNumber' ? 'settings.invalidNumber' : 'settings.outOfRange';
      this.fieldError.set({ key: result.key, message });
      return;
    }
    if (Object.keys(result.value).length === 0) return;
    this.saving.set(true);
    try {
      await this.api.saveSettings(result.value);
      this.notify.success('settings.saved');
      this.settings.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async block() {
    this.blockForm.markAllAsTouched();
    if (this.blockForm.invalid) return;
    const v = this.blockForm.getRawValue();
    try {
      await this.api.createBlocked({
        kind: v.kind,
        value: v.value.trim(),
        ...(v.reason.trim() ? { reason: v.reason.trim() } : {}),
      });
      this.notify.success('blocked.created');
      this.blockForm.reset({ kind: v.kind, value: '', reason: '' });
      this.blocked.reload();
    } catch (e) {
      this.notify.error(e);
    }
  }

  /** Loads the version in force and puts its title and text in the editor (empty when there is none). */
  protected async loadCurrentLegal() {
    const { kind, locale } = this.legalForm.getRawValue();
    if (!locale.trim()) return;
    try {
      const doc = await this.api.currentLegal(kind, locale.trim());
      this.legalCurrent.set(doc);
      this.legalForm.patchValue(
        { title: doc?.title ?? '', text: doc?.text ?? '' },
        { emitEvent: false },
      );
    } catch (e) {
      this.notify.error(e);
    }
  }

  protected async publish() {
    this.legalForm.markAllAsTouched();
    if (this.legalForm.invalid || this.publishing()) return;
    const v = this.legalForm.getRawValue();
    this.publishing.set(true);
    try {
      const doc = await this.api.publishLegal({
        kind: v.kind,
        locale: v.locale.trim(),
        title: v.title.trim(),
        text: v.text.trim(),
      });
      this.notify.success('legal.published', { version: doc.version });
      await this.loadCurrentLegal();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.publishing.set(false);
    }
  }
}
