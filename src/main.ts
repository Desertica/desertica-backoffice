import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { applyDevOverrides, loadRuntimeConfig } from './app/core/config/runtime-config';

// The runtime config (API url, Google client id) is fetched before bootstrap so every service can read it synchronously.
loadRuntimeConfig()
  .then((config) => (isDevMode() ? applyDevOverrides(config, location.search) : config))
  .then((config) => bootstrapApplication(App, appConfig(config)))
  .catch((err) => console.error(err));
