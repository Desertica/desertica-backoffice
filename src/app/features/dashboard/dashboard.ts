import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <h1 class="text-2xl font-semibold">{{ 'nav.dashboard' | t }}</h1>
    <p class="mt-2 text-muted-foreground">{{ 'placeholder.soon' | t }}</p>
  `,
})
export class Dashboard {}
