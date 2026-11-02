# BarberPro — MVP desplegable

SaaS multiempresa para barberías con Next.js 15, Supabase Auth y Postgres. Incluye página pública por slug (`/mi-barberia`), catálogo, solicitud de reservas, panel privado de citas/servicios/barberos/clientes y SQL de seguridad.

## Requisitos
- Node.js 20.9 o superior
- Proyecto Supabase
- Cuenta Netlify

## Ejecutar localmente (Windows PowerShell)
```powershell
npm install
Copy-Item .env.example .env.local
# Edita .env.local con Project URL y Publishable/anon key
npm run dev
```
Abre http://localhost:3000.

## Configurar Supabase
1. En SQL Editor ejecuta `supabase/migrations/001_core.sql` una sola vez.
2. Ejecuta `supabase/migrations/002_booking_and_public_catalog.sql`.
   Luego, **cada una en su propia ejecución y en este orden**: `003_roles_enum.sql`, `004_security_hardening.sql`, `005_availability_and_booking.sql` y finalmente `006_branding_storage.sql` (cada una en una ejecución separada; probar primero en un proyecto de pruebas; ver `docs/AUDITORIA.md`).
   `005` crea un horario por defecto editable (lun–sáb 09:00–19:00) para barberos existentes sin horario.
   Verificación: `supabase/tests/verify_security_and_booking.sql`. Superadmin: `supabase/setup_superadmin.sql`.
   En Authentication → URL Configuration agrega también `http://localhost:3000/auth/callback` (recuperación de contraseña).
3. Crea el usuario propietario en Authentication → Users (desactiva el registro público si no lo necesitas).
4. Abre `supabase/setup_first_owner.sql` (después de 001–005), sustituye UUID/nombre/slug y ejecútalo. Es un script de primer uso: no lo repitas porque crea un negocio nuevo.
5. En Authentication → URL Configuration agrega `http://localhost:3000/**` en Redirect URLs y tu dominio Netlify.
6. En Netlify configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_APP_URL`.

## Desplegar en Netlify
1. Sube el proyecto a un repositorio Git (GitHub/GitLab) o arrastra el ZIP descomprimido al flujo de importación compatible. Recomendado: conectar Git.
2. Netlify detecta `netlify.toml`; build command `npm run build`.
3. Configura las tres variables de entorno anteriores en Site configuration → Environment variables.
4. Ejecuta Deploy. Añade la URL `https://tu-sitio.netlify.app/**` a Supabase Auth → URL Configuration.

## Flujo
- La ruta `/{slug}` muestra el sitio público del negocio activo.
- El formulario llama a `create_public_booking`, función SQL con `SECURITY DEFINER`, que valida negocio/servicio/barbero y crea una cita pendiente. La restricción de exclusión impide solapamientos por barbero.
- `/dashboard` requiere sesión y muestra datos únicamente de negocios donde el usuario tenga membresía activa.
- El propietario puede gestionar estado de citas, servicios, barberos y consultar clientes.

## Alcance y pendientes antes de producción
Este paquete sigue siendo una versión de desarrollo y no está certificado para producción. Incluye motor de disponibilidad y reservas, paneles por rol, calendario visual, personalización de marca, imágenes de barberos, acciones manuales de WhatsApp y herramientas de superadministrador. No incluye todavía pagos online, sucursales, suscripciones SaaS ni envío automático por WhatsApp Business API. El calendario permite mover citas entre días conservando hora y duración; la restricción de la base de datos debe verificarse en Supabase real antes de usarlo con clientes.

No agregues jamás `service_role` al frontend ni a variables `NEXT_PUBLIC_*`. Mantén el registro público desactivado hasta implementar un onboarding con verificación y controles antiabuso. Revisa las políticas RLS en un proyecto de pruebas antes de producción.

## Pruebas
`npm test` ejecuta las pruebas de utilidades (zona horaria y redirecciones seguras). Las pruebas de base de datos están en `supabase/tests/` y deben ejecutarse a mano en un proyecto de pruebas.

## Fase 1b: calendario, marca y seguridad

Después de las migraciones 001–005, ejecuta `supabase/migrations/006_branding_storage.sql` una sola vez en Supabase. Crea el bucket público `barberpro-media` con límite de 5 MB e imágenes JPEG/PNG/WebP/AVIF; las escrituras quedan limitadas a administradores del negocio y superadmin mediante RLS de Storage.

Para registrar barberías e invitar propietarios desde `/superadmin`, configura `SUPABASE_SERVICE_ROLE_KEY` como variable **sólo de servidor** en `.env.local` y en Netlify. No la publiques ni la incluyas en variables `NEXT_PUBLIC_`. Sin esta variable, las operaciones administrativas que la requieren mostrarán un error seguro.

El panel de barbería incluye calendario de día/semana/mes, personalización de logo/portada y fotos del equipo. El contacto de citas usa enlaces `wa.me` con mensajes preparados; el envío automático de WhatsApp no está activado. Para automatizarlo hace falta integrar WhatsApp Business Platform con un proveedor oficial, webhooks y plantillas aprobadas.

La política CSP está aplicada desde `next.config.mjs`. Revisa los reportes de consola y ajusta orígenes si conectas nuevos proveedores externos. Las fuentes de Google se cargan por `next/font` durante el build.
