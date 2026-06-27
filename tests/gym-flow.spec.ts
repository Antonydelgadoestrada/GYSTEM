import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno del archivo .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Flujo completo de GYMFLOW', () => {
  const timestamp = Date.now();
  const testEmail = `gymflow.test.${timestamp}@gmail.com`;
  const gymName = `E2E Gym ${timestamp}`;
  const adminName = `E2E Admin ${timestamp}`;
  const membershipName = `Plan Mensual E2E ${timestamp}`;
  const customerName = `Cliente E2E ${timestamp}`;

  test('Debería registrarse, crear membresía, agregar cliente, cobrar membresía y cerrar sesión', async ({ page }) => {
    // Interceptar llamadas de autenticación de Supabase para evitar requerir confirmación por correo
    await page.route('**/auth/v1/signup', async route => {
      const json = {
        access_token: supabaseAnonKey,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: supabaseAnonKey,
        user: {
          id: 'c35c59b4-4966-4594-a573-e486a6cfa1a2',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'n4sh3333@gmail.com',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { role: 'admin', full_name: 'GABRIEL NOLE' },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        session: {
          access_token: supabaseAnonKey,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: supabaseAnonKey,
          user: {
            id: 'c35c59b4-4966-4594-a573-e486a6cfa1a2',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'n4sh3333@gmail.com',
            email_confirmed_at: new Date().toISOString(),
            phone: '',
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { role: 'admin', full_name: 'GABRIEL NOLE' },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      };
      await route.fulfill({ json });
    });

    await page.route('**/auth/v1/logout', async route => {
      await route.fulfill({ status: 204 });
    });

    // 1. Registro
    await page.goto('/register');
    
    // Rellenar el formulario de registro
    await page.getByPlaceholder('Ej: Power Box CrossFit').fill(gymName);
    await page.getByPlaceholder('Ej: Juan Pérez').fill(adminName);
    await page.getByPlaceholder('ejemplo@gimnasio.com').fill(testEmail);
    await page.getByPlaceholder('Mínimo 6 caracteres').fill('password123');

    // Clic en registrar
    await page.getByRole('button', { name: 'Registrar Gimnasio' }).click();

    // Esperar redirección al Dashboard (ruta '/')
    await page.waitForURL('**/');
    
    // Verificar que el dashboard se cargue
    await expect(page.getByRole('heading', { name: 'Panel de Control GYMFLOW' })).toBeVisible();

    // 2. Crear Membresía
    await page.getByRole('link', { name: 'Membresías' }).click();
    await page.waitForURL('**/membresias');
    await expect(page.getByRole('heading', { name: 'Catálogo de Membresías' })).toBeVisible();

    // Abrir formulario de nueva membresía
    await page.getByRole('button', { name: 'Crear Membresía' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva Membresía' })).toBeVisible();

    // Llenar formulario de membresía
    await page.getByPlaceholder('Ej: Pase Mensual VIP').fill(membershipName);
    await page.getByPlaceholder('0.00').fill('75');
    await page.getByPlaceholder('30').fill('30'); // Duración predeterminada 30 días

    // Guardar membresía
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // Verificar que la membresía aparece en la lista
    await expect(page.getByText(membershipName)).toBeVisible();

    // 3. Registrar Venta (Cobro) y Cliente Rápido
    await page.getByRole('link', { name: 'Pagos / Caja' }).click();
    await page.waitForURL('**/pagos');
    await expect(page.getByRole('heading', { name: 'Caja e Ingresos' })).toBeVisible();

    // Abrir modal de venta
    await page.getByRole('button', { name: 'Registrar Venta (Cobro)' }).click();
    await expect(page.getByRole('heading', { name: 'Registrar Venta / Asignar Plan' })).toBeVisible();

    // Clic en "Nuevo" para crear cliente rápido
    await page.getByRole('button', { name: 'Nuevo' }).click();
    await expect(page.getByText('Rápido: Nuevo Cliente')).toBeVisible();

    // Checkear menor de edad para ingreso manual sin DNI
    await page.getByLabel('Menor de Edad (Ingreso manual)').check();
    
    // Rellenar datos rápidos del cliente
    await page.getByPlaceholder('Nombre y Apellidos').fill(customerName);
    await page.getByPlaceholder('987654321').fill('999888777');
    await page.getByPlaceholder('Ej: 100234').fill(`PIN${timestamp}`);

    // Clic en Crear y Seleccionar
    await page.getByRole('button', { name: 'Crear y Seleccionar' }).click();

    // Verificar que el cliente aparece seleccionado en el modal
    await expect(page.getByText(customerName)).toBeVisible();

    // Seleccionar la membresía que acabamos de crear en el selector de planes
    const selectPlan = page.locator('select[name="membership_id"]');
    const optionValue = await selectPlan.locator('option').evaluateAll((options, name) => {
      const found = options.find(opt => opt.textContent && opt.textContent.includes(name));
      return found ? (found as HTMLOptionElement).value : '';
    }, membershipName);
    await selectPlan.selectOption(optionValue);

    // Procesar la venta
    await page.getByRole('button', { name: 'Procesar Venta' }).click();

    // Verificar que el modal se cierra
    await expect(page.getByRole('heading', { name: 'Registrar Venta / Asignar Plan' })).not.toBeVisible();

    // 4. Verificar Cliente en Administración de Clientes
    await page.getByRole('link', { name: 'Clientes' }).click();
    await page.waitForURL('**/clientes');
    await expect(page.getByRole('heading', { name: 'Administración de Clientes' })).toBeVisible();

    // Buscar al cliente creado en el input de búsqueda
    await page.getByPlaceholder('Buscar por nombre, correo, PIN...').fill(customerName);
    await expect(page.getByRole('heading', { name: customerName })).toBeVisible();
    
    // Hacer clic en "Ver Ficha" para ir a sus detalles
    await page.getByRole('button', { name: 'Ver Ficha' }).click();
    await page.waitForURL(/\/clientes\/.+/);

    // Verificar que estamos en la página de detalles del cliente
    await expect(page.getByRole('heading', { name: customerName })).toBeVisible();
    await expect(page.getByText(membershipName).first()).toBeVisible();
    await expect(page.getByText('Vigente').first()).toBeVisible();

    // 5. Cerrar Sesión
    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});
