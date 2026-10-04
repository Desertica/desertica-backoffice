import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { Role, User } from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { TPipe } from '../../core/i18n/t.pipe';
import { injectDialog, useDialogs } from '../../shared/dialog';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { AdminApi } from './admin.api';

@Component({
  selector: 'app-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ (user ? 'users.edit.title' : 'users.create.title') | t }}</h2>
        @if (!user) {
          <p hlmDialogDescription>{{ 'users.create.hint' | t }}</p>
        }
        @if (isSelf) {
          <p hlmDialogDescription>{{ 'users.edit.selfHint' | t }}</p>
        }
      </hlm-dialog-header>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'users.field.name' | t }}</span>
        <input hlmInput formControlName="name" />
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'users.field.email' | t }}</span>
        <input hlmInput type="email" formControlName="email" />
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <span class="text-xs text-destructive">{{ 'common.invalidEmail' | t }}</span>
        }
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'users.field.role' | t }}</span>
        <select hlmInput formControlName="roleId">
          @for (r of roles; track r.id) {
            <option [value]="r.id">{{ r.name }}</option>
          }
        </select>
      </label>
      @if (user) {
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" formControlName="active" /> {{ 'users.field.active' | t }}
        </label>
      }
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy()">{{ 'common.save' | t }}</button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class UserDialog {
  protected readonly dialog = injectDialog<{ user?: User; roles: Role[] }, boolean>();
  private readonly api = inject(AdminApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly user = this.dialog.context.user;
  protected readonly roles = this.dialog.context.roles;
  /** Self-lockout guard (UI only; the API is the authority). */
  protected readonly isSelf = !!this.user && this.user.id === inject(AuthService).user()?.id;
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({
    name: [this.user?.name ?? '', Validators.required],
    email: [
      { value: this.user?.email ?? '', disabled: !!this.user },
      [Validators.required, Validators.email],
    ],
    roleId: [
      { value: this.user?.role.id ?? this.roles[0]?.id ?? '', disabled: this.isSelf },
      Validators.required,
    ],
    active: [{ value: this.user?.active ?? true, disabled: this.isSelf }],
  });

  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.busy.set(true);
    try {
      if (this.user) {
        await this.api.updateUser(this.user.id, {
          name: v.name.trim(),
          ...(this.isSelf ? {} : { roleId: v.roleId, active: v.active }),
        });
        this.notify.success('users.edit.done');
      } else {
        await this.api.createUser({ email: v.email.trim(), name: v.name.trim(), roleId: v.roleId });
        this.notify.success('users.create.done');
      }
      this.dialog.close(true);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TPipe,
    LimaDateTimePipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold">{{ 'users.title' | t }}</h1>
        <button *appHasPermission="'users:write'" hlmBtn (click)="open()">
          {{ 'users.new' | t }}
        </button>
      </div>

      <div class="flex gap-1 border-b border-border" role="tablist">
        <button
          role="tab"
          hlmBtn
          variant="ghost"
          size="sm"
          [attr.aria-selected]="tab() === 'users'"
          [class.font-semibold]="tab() === 'users'"
          (click)="tab.set('users')"
        >
          {{ 'users.tab.users' | t }}
        </button>
        <button
          role="tab"
          hlmBtn
          variant="ghost"
          size="sm"
          [attr.aria-selected]="tab() === 'roles'"
          [class.font-semibold]="tab() === 'roles'"
          (click)="tab.set('roles')"
        >
          {{ 'users.tab.roles' | t }}
        </button>
      </div>

      @if (users.error() || roles.error()) {
        <div class="flex items-center gap-3 text-sm text-destructive" role="alert">
          {{ 'users.loadError' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (!users.hasValue() || !roles.hasValue()) {
        <hlm-skeleton class="h-48" />
      } @else if (tab() === 'users') {
        <div hlmTableContainer>
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh>{{ 'users.col.name' | t }}</th>
                <th hlmTh>{{ 'users.col.email' | t }}</th>
                <th hlmTh>{{ 'users.col.role' | t }}</th>
                <th hlmTh>{{ 'users.col.active' | t }}</th>
                <th hlmTh>{{ 'users.col.lastLogin' | t }}</th>
                <th hlmTh></th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (u of users.value(); track u.id) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">
                    {{ u.name }}
                    @if (u.id === me()?.id) {
                      <span class="text-xs text-muted-foreground">{{ 'users.you' | t }}</span>
                    }
                  </td>
                  <td hlmTd>{{ u.email }}</td>
                  <td hlmTd>{{ u.role.name }}</td>
                  <td hlmTd>{{ u.active ? '✓' : '—' }}</td>
                  <td hlmTd>
                    {{ u.lastLoginAt ? (u.lastLoginAt | limaDateTime) : ('users.never' | t) }}
                  </td>
                  <td hlmTd class="text-right">
                    <button
                      *appHasPermission="'users:write'"
                      hlmBtn
                      variant="outline"
                      size="xs"
                      (click)="open(u)"
                    >
                      {{ 'common.edit' | t }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="grid gap-4 md:grid-cols-2">
          @for (r of roles.value(); track r.id) {
            <section class="rounded-lg border border-border p-4">
              <h2 class="font-medium">
                {{ r.name }} <span class="text-xs text-muted-foreground">({{ r.key }})</span>
              </h2>
              <details class="mt-2 text-sm">
                <summary class="cursor-pointer text-muted-foreground">
                  {{ 'users.roles.permissions' | t: { count: r.permissions.length } }}
                </summary>
                <ul class="mt-2 flex flex-wrap gap-1">
                  @for (p of r.permissions; track p) {
                    <li class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ p }}</li>
                  }
                </ul>
              </details>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class UsersPage {
  private readonly api = inject(AdminApi);
  private readonly dialogs = useDialogs();
  protected readonly me = inject(AuthService).user;
  protected readonly tab = signal<'users' | 'roles'>('users');
  protected readonly users = resource({ loader: () => this.api.listUsers() });
  protected readonly roles = resource({ loader: () => this.api.listRoles() });

  protected reload() {
    this.users.reload();
    this.roles.reload();
  }

  protected async open(user?: User) {
    if (await this.dialogs.open(UserDialog, { user, roles: this.roles.value() ?? [] }))
      this.users.reload();
  }
}
