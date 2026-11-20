import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/guards/auth.guards';
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'catalog',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./products/pages/catalog/products.component').then((m) => m.ProductsComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  { path: '**', redirectTo: 'catalog' },
];
