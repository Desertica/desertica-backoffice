import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TPipe } from '../core/i18n/t.pipe';

/** Warns that a list stopped at its fetch limit, so staff do not mistake it for the whole set. */
@Component({
  selector: 'app-truncated-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    @if (show()) {
      <p class="text-xs text-destructive" role="status">{{ 'common.truncated' | t }}</p>
    }
  `,
})
export class TruncatedNotice {
  readonly show = input<boolean | undefined>(false);
}
