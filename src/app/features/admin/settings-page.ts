import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { LegalDocumentKind } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import type { MessageKey } from '../../core/i18n/messages.es';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { AdminApi } from './admin.api';
import { type SettingRow, type SettingType, fromRows, toRows } from './settings-model';

const LEGAL_KINDS: readonly LegalDocumentKind[] = [
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
  ],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  private readonly api = inject(AdminApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly types: readonly { value: SettingType; label: MessageKey }[] = [
    { value: 'string', label: 'settings.type.string' },
    { value: 'number', label: 'settings.type.number' },
    { value: 'boolean', label: 'settings.type.boolean' },
    { value: 'json', label: 'settings.type.json' },
  ];
  protected readonly legalKinds = LEGAL_KINDS;

  protected readonly settings = resource({ loader: () => this.api.getSettings() });
  protected readonly blocked = resource({ loader: () => this.api.listBlocked() });
  protected readonly rows = signal<SettingRow[]>([]);
  protected readonly rowError = signal<{ key: MessageKey; index: number } | null>(null);
  protected readonly saving = signal(false);

  protected readonly blockForm = this.fb.group({
    kind: ['EMAIL' as 'EMAIL' | 'IP'],
    value: ['', Validators.required],
    reason: [''],
  });
  protected readonly legalForm = this.fb.group({
    kind: ['TERMS' as LegalDocumentKind],
    locale: ['es', Validators.required],
    cmsSlug: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const s = this.settings.value();
      if (s) this.rows.set(toRows(s));
    });
  }

  protected update(index: number, patch: Partial<SettingRow>) {
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    this.rowError.set(null);
  }

  protected add() {
    this.rows.update((rows) => [...rows, { key: '', type: 'string', text: '' }]);
  }

  protected remove(index: number) {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected async save() {
    const result = fromRows(this.rows());
    if ('error' in result) {
      const key: Record<typeof result.error, MessageKey> = {
        invalidNumber: 'settings.invalidNumber',
        invalidJson: 'settings.invalidJson',
        duplicateKey: 'settings.duplicateKey',
        emptyKey: 'common.required',
      };
      this.rowError.set({ key: key[result.error], index: result.index });
      return;
    }
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

  protected async publish() {
    this.legalForm.markAllAsTouched();
    if (this.legalForm.invalid) return;
    const v = this.legalForm.getRawValue();
    try {
      const doc = await this.api.publishLegal({
        kind: v.kind,
        locale: v.locale.trim(),
        cmsSlug: v.cmsSlug.trim(),
      });
      this.notify.success('legal.published', { version: doc.version });
      this.legalForm.patchValue({ cmsSlug: '' });
    } catch (e) {
      this.notify.error(e);
    }
  }
}
