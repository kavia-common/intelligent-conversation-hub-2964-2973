import { ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * SSR bootstrap function.
 * IMPORTANT: For SSR, export default MUST return Promise<ApplicationRef>
 */
const bootstrap = (): Promise<ApplicationRef> => bootstrapApplication(AppComponent, config);

export default bootstrap;
