import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { Document, DocumentStatus, DocumentType } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { addDays, limaToUtcIso } from '../../core/format/datetime';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { useDialogs } from '../../shared/dialog';
import { saveBlob } from '../../shared/download';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';
import { CreditNoteDialog, VoidDocumentDialog, documentNumber } from './document-dialogs';
import { type DocumentQuery, DocumentsApi } from './documents.api';

const STATUSES: readonly DocumentStatus[] = [
  'PENDING',
  'ISSUED',
  'ACCEPTED',
  'REJECTED',
  'VOIDED',
  'ERROR',
];
const TYPES: readonly DocumentType[] = ['BOLETA', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO'];

export function toDocumentQuery(f: {
  status?: string;
  docType?: string;
  from?: string;
  to?: string;
  page?: string;
}): DocumentQuery {
  const q: DocumentQuery = { page: Number(f.page) > 0 ? Number(f.page) : 1, pageSize: 25 };
  if (f.status && (STATUSES as readonly string[]).includes(f.status))
    q.status = f.status as DocumentStatus;
  if (f.docType && (TYPES as readonly string[]).includes(f.docType))
    q.docType = f.docType as DocumentType;
  if (f.from) q.from = limaToUtcIso(f.from);
  if (f.to) q.to = limaToUtcIso(addDays(f.to, 1));
  return q;
}

/** Which row actions apply to a document in each state (the API still validates). */
export function documentActions(d: Pick<Document, 'status' | 'docType'>) {
  const live = d.status === 'ISSUED' || d.status === 'ACCEPTED';
  return {
    retry: d.status === 'ERROR' || d.status === 'REJECTED',
    void: live && d.docType !== 'NOTA_CREDITO',
    creditNote: live && (d.docType === 'BOLETA' || d.docType === 'FACTURA'),
  };
}

@Component({
  selector: 'app-documents-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    StatusBadge,
    Pager,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  templateUrl: './documents-page.html',
})
export class DocumentsPage {
  readonly status = input<string>();
  readonly docType = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly page = input<string>();

  private readonly api = inject(DocumentsApi);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);
  private readonly dialogs = useDialogs();
  protected readonly statuses = STATUSES;
  protected readonly types = TYPES;
  protected readonly number = documentNumber;
  protected readonly actions = documentActions;

  protected readonly query = computed(() =>
    toDocumentQuery({
      status: this.status(),
      docType: this.docType(),
      from: this.from(),
      to: this.to(),
      page: this.page(),
    }),
  );
  protected readonly documents = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.list(params),
  });

  protected setFilter(key: 'status' | 'docType' | 'from' | 'to', value: string) {
    void this.navigate({ [key]: value || null, page: null });
  }
  protected goTo(page: number) {
    void this.navigate({ page: page > 1 ? page : null });
  }

  protected async download(d: Document, kind: 'pdf' | 'xml' | 'cdr') {
    try {
      saveBlob(
        await this.api.file(d.id, kind),
        `${documentNumber(d)}.${kind === 'cdr' ? 'zip' : kind}`,
      );
    } catch (e) {
      this.notify.error(e);
    }
  }

  protected async retry(d: Document) {
    try {
      await this.api.retry(d.id);
      this.notify.success('documents.retry.done');
      this.documents.reload();
    } catch (e) {
      this.notify.error(e);
    }
  }

  protected async void(d: Document) {
    if (await this.dialogs.open(VoidDocumentDialog, { document: d })) this.documents.reload();
  }

  protected async creditNote(d: Document) {
    if (await this.dialogs.open(CreditNoteDialog, { document: d })) this.documents.reload();
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
