import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const email = process.env['WEB_E2E_EMAIL'] ?? 'web-fixture@example.test';
const password = process.env['WEB_E2E_PASSWORD'] ?? 'Synthetic-Only-E2E-Password-2026!';
test('real login, catalog CRUD, URL state, cookie recovery and logout', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const name = `Semilla ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/catalog');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Ingresar al catálogo/ }).click();
  await expect(page.getByRole('heading', { name: /Tu catálogo de productos/ })).toBeVisible();
  for (const [suffix, price] of [
    ['A', '12.34'],
    ['B', '20.01'],
  ]) {
    await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nombre del producto').fill(`${name} ${suffix}`);
    await dialog.getByLabel(/^Precio/).fill(price);
    await dialog.getByLabel(/^Existencias/).fill('5');
    await dialog.getByLabel(/Categoría/).fill('Semillas');
    await dialog.getByLabel(/Descripción/).fill('Producto de prueba sintético');
    await dialog.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const toast = page.locator('.catalog-toast');
    await expect(toast).toContainText('Producto creado.');
    expect(await toast.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
    expect((await toast.boundingBox())!.width).toBeLessThanOrEqual(340);
    if (suffix === 'A') {
      await mkdir('e2e/evidence', { recursive: true });
      await page.screenshot({path: `e2e/evidence/${testInfo.project.name}-created.png`, fullPage:true});
    }
    await toast.getByRole('button', {name:'Cerrar mensaje'}).click();
    await expect(toast).toHaveCount(0);
    await expect(page.getByText(`${name} ${suffix}`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: `Editar ${name} A`, exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^Precio/).fill('15.99');
  await dialog.getByLabel(/^Existencias/).fill('0');
  await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const row = page.getByRole('row').filter({ hasText: `${name} A` });
  await expect(row).toContainText('15.99');
  await expect(row).toContainText('Sin existencias');
  const refreshes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/auth/refresh')
      refreshes.push(request.url());
  });
  await page.reload();
  await expect(page.getByText(`${name} A`, { exact: true })).toBeVisible();
  expect(refreshes).toHaveLength(1);
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    visibleCookies: document.cookie,
  }));
  expect(stored.local).toEqual([]);
  expect(stored.session).toEqual([]);
  expect(stored.visibleCookies).not.toContain('refresh_token');
  const cookie = (await context.cookies()).find((cookie) => cookie.name === 'refresh_token');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(cookie?.path).toBe('/auth');
  await page.goto(
    `/catalog?page=1&pageSize=1&search=${encodeURIComponent(name)}&category=Semillas&sortBy=priceMinor&sortDirection=asc`,
  );
  await expect(page.getByText(`${name} A`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${name} B`, { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(`${name} B`, { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText(`${name} A`, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await mkdir('e2e/evidence', { recursive: true });
  await page.screenshot({
    path: `e2e/evidence/${testInfo.project.name}-catalog.png`,
    fullPage: true,
  });
  await expect(page.getByRole('button', { name: 'Ver consejos' })).toHaveCount(0);
  await page.getByRole('button', { name: `Eliminar ${name} A`, exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '¿Eliminar este producto?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Conservar', exact: true }).click();
  await expect(page.getByText(`${name} A`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Eliminar ${name} A`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar', exact: true }).click();
  await expect(page.getByText(`${name} A`, { exact: true })).not.toBeVisible();
  await expect(page.getByText(`${name} B`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Eliminar ${name} B`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No hay coincidencias', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Cerrar sesión/ }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await context.cookies()).some((cookie) => cookie.name === 'refresh_token')).toBe(false);
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});
