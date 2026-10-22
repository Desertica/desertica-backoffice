import type { ComponentType } from '@angular/cdk/portal';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';

/** Opens a dialog component and resolves with whatever it passes to `close(result)` (undefined if dismissed). */
export function useDialogs() {
  const service = inject(HlmDialogService);
  return {
    open<R, C = unknown>(component: ComponentType<unknown>, context?: C): Promise<R | undefined> {
      const ref = service.open<R, C>(component, { context, contentClass: 'sm:max-w-lg' });
      return firstValueFrom(ref.closed$);
    },
  };
}

/** Inside a dialog component: its context (inputs) and a way to close with a result. */
export function injectDialog<C, R = true>() {
  const ref = inject<BrnDialogRef<R>>(BrnDialogRef);
  const context = injectBrnDialogContext<C>();
  return { context, close: (result?: R) => ref.close(result), ref };
}
