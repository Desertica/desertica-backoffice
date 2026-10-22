import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { CompanyInput, DocumentType } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { useDialogs } from '../../shared/dialog';
import { I18n } from '../../core/i18n/i18n.service';
import { Notify } from '../../shared/notify';
import { TypedConfirmDialog } from '../../shared/typed-confirm-dialog';
import { AdminApi } from './admin.api';

/** Series prefixes: B (boleta), F (factura) or E, then 3 letters or digits. */
export const SERIES_PREFIX = /^[BFE][A-Z0-9]{3}$/;

/** Boletas start with B, facturas with F, notes follow the document they correct (B or F); E is accepted for any. */
export function seriesPrefixError(docType: DocumentType, prefix: string): boolean {
  const p = prefix.trim().toUpperCase();
  const allowed = docType === 'BOLETA' ? 'BE' : docType === 'FACTURA' ? 'FE' : 'BFE';
  return !SERIES_PREFIX.test(p) || !allowed.includes(p[0]);
}

export function buildCompany(v: {
  ruc: string;
  legalName: string;
  tradeName: string;
  fiscalAddress: string;
  ubigeo: string;
  igvRate: string;
  environment: 'BETA' | 'PRODUCTION';
}): CompanyInput {
  return {
    ruc: v.ruc.trim(),
    legalName: v.legalName.trim(),
    fiscalAddress: v.fiscalAddress.trim(),
    environment: v.environment,
    ...(v.tradeName.trim() ? { tradeName: v.tradeName.trim() } : {}),
    ...(v.ubigeo.trim() ? { ubigeo: v.ubigeo.trim() } : {}),
    ...(v.igvRate.trim() ? { igvRate: v.igvRate.trim() } : {}),
  };
}

@Component({
  selector: 'app-company-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    EnumLabelPipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  templateUrl: './company-page.html',
})
export class CompanyPage {
  private readonly api = inject(AdminApi);
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);
  private readonly dialogs = useDialogs();
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly saving = signal(false);
  protected readonly creating = signal(false);
  protected readonly docTypes: readonly DocumentType[] = [
    'BOLETA',
    'FACTURA',
    'NOTA_CREDITO',
    'NOTA_DEBITO',
  ];

  protected readonly company = resource({ loader: () => this.api.getCompany() });
  protected readonly series = resource({ loader: () => this.api.listSeries() });

  protected readonly form = this.fb.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    legalName: ['', Validators.required],
    tradeName: [''],
    fiscalAddress: ['', Validators.required],
    ubigeo: ['', Validators.pattern(/^(\d{6})?$/)],
    igvRate: [''],
    environment: ['BETA' as 'BETA' | 'PRODUCTION'],
  });
  protected readonly seriesForm = this.fb.group(
    {
      docType: ['BOLETA' as DocumentType],
      prefix: ['', Validators.required],
      nextNumber: [1, [Validators.required, Validators.min(1)]],
    },
    {
      // Upper-cased before checking, so typing `b001` is fine.
      validators: (g) =>
        seriesPrefixError(g.get('docType')!.value, g.get('prefix')!.value)
          ? { prefix: true }
          : null,
    },
  );

  constructor() {
    effect(() => {
      const c = this.company.value();
      if (c)
        this.form.reset({
          ruc: c.ruc,
          legalName: c.legalName,
          tradeName: c.tradeName ?? '',
          fiscalAddress: c.fiscalAddress,
          ubigeo: c.ubigeo ?? '',
          igvRate: c.igvRate ?? '',
          environment: c.environment ?? 'BETA',
        });
    });
  }

  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const input = buildCompany(this.form.getRawValue());
    if (input.environment === 'PRODUCTION' && this.company.value()?.environment !== 'PRODUCTION') {
      const ok = await this.dialogs.open<boolean>(TypedConfirmDialog, {
        title: this.i18n.t('company.productionTitle'),
        description: this.i18n.t('company.productionWarning'),
        accepted: [input.ruc, 'PRODUCCION'],
      });
      if (!ok) return;
    }
    this.saving.set(true);
    try {
      await this.api.saveCompany(input);
      this.notify.success('company.saved');
      this.company.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async createSeries() {
    this.seriesForm.markAllAsTouched();
    if (this.seriesForm.invalid) return;
    const v = this.seriesForm.getRawValue();
    this.creating.set(true);
    try {
      await this.api.createSeries({
        docType: v.docType,
        prefix: v.prefix.trim().toUpperCase(),
        nextNumber: v.nextNumber,
      });
      this.notify.success('series.created');
      this.seriesForm.reset({ docType: 'BOLETA', prefix: '', nextNumber: 1 });
      this.series.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.creating.set(false);
    }
  }
}
