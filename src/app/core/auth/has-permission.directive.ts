import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * `<button *appHasPermission="'bookings:cancel'">` renders only when the signed-in role has the permission.
 * Cosmetic only: the API enforces authorization.
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermissionDirective {
  readonly appHasPermission = input.required<string | string[]>();

  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const list = Array.isArray(required) ? required : [required];
      const allowed = list.some((p) => this.auth.has(p));
      if (allowed && !this.shown) {
        this.container.createEmbeddedView(this.template);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.container.clear();
        this.shown = false;
      }
    });
  }
}
