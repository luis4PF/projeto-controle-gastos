import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginPageGuard } from './core/guards/login-page.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginPageGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expense-list.component').then((m) => m.ExpenseListComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/category-list.component').then((m) => m.CategoryListComponent),
      },
      {
        path: 'payment-methods',
        loadComponent: () =>
          import('./features/payment-methods/payment-method-list.component').then(
            (m) => m.PaymentMethodListComponent
          ),
      },
      {
        path: 'people',
        loadComponent: () =>
          import('./features/people/person-list.component').then((m) => m.PersonListComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/user-list.component').then((m) => m.UserListComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
