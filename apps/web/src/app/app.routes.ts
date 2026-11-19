import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guards';
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'catalog',
    canActivate: [authGuard],
    loadComponent: () => import('./products/products.component').then((m) => m.ProductsComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'catalog' },
  { path: '**', redirectTo: 'catalog' },
];
