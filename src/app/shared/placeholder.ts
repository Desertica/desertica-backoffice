import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TPipe } from '../core/i18n/t.pipe';

@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `<p class="text-muted-foreground">{{ 'placeholder.soon' | t }}</p>`,
})
export class Placeholder {}
