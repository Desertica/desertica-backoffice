import {
  type ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { RUNTIME_CONFIG, type RuntimeConfig } from './core/config/runtime-config';

// Zoneless is the default in Angular 21: no zone.js provider is needed.
export const appConfig = (runtime: RuntimeConfig): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: RUNTIME_CONFIG, useValue: runtime },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideSpartanHlm(),
    provideNativeDateAdapter(),
    // Restore the session (refresh token -> access token -> /auth/me) before the first navigation.
    provideAppInitializer(() => inject(AuthService).init()),
  ],
});
