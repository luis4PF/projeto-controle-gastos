import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { routes } from './app.routes';

registerLocaleData(localePt);
import { authHeaderInterceptor } from './core/interceptors/auth-header.interceptor';
import { fakeBackendInterceptor } from './core/interceptors/fake-backend.interceptor';

/**
 * Quando o backend real estiver disponível:
 * - remova `fakeBackendInterceptor` dos interceptors
 * - configure `environment.apiUrl` (e proxy se necessário)
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authHeaderInterceptor, fakeBackendInterceptor])),
    provideNativeDateAdapter(),
    provideCharts(withDefaultRegisterables()),
    provideEnvironmentNgxMask(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
  ],
};
