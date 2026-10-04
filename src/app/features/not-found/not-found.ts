import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { TPipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, HlmButtonImports],
  template: `
    <h1 class="text-2xl font-semibold">{{ 'notFound.title' | t }}</h1>
    <p class="mt-2 text-muted-foreground">{{ 'notFound.body' | t }}</p>
    <a hlmBtn variant="outline" class="mt-4" routerLink="/">{{ 'notFound.back' | t }}</a>
  `,
})
export class NotFound {}
