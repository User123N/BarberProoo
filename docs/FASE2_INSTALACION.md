# Instalar las mejoras de BarberPro (Fase 2 parcial)

## Si ya ejecutaste las migraciones 001 a 005

No vuelvas a ejecutarlas. Abre Supabase → SQL Editor, pega `supabase/migrations/006_branding_storage.sql` y ejecútala una sola vez. Esta migración crea el bucket `barberpro-media` y sus políticas de acceso.

## Variables locales

En `.env.local` conserva las variables públicas de Supabase y agrega:

```env
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

Esta clave se obtiene en la configuración API del proyecto Supabase. Sólo se utiliza en rutas del servidor para las operaciones del superadministrador. No la compartas, no la subas a GitHub y nunca le pongas el prefijo `NEXT_PUBLIC_`.

## Netlify

Agrega las mismas variables en Site configuration → Environment variables. La clave `SUPABASE_SERVICE_ROLE_KEY` debe permanecer como variable privada de servidor. Después ejecuta un nuevo deploy.

## Funciones nuevas

- Panel de barbería → Calendario: vistas día, semana y mes; filtro por barbero; arrastrar citas a otro día conserva hora y duración y la base de datos debe rechazar solapamientos.
- Panel de barbería → Ajustes: logo, portada, descripción, teléfono, dirección, ciudad y reglas de reserva.
- Panel de barbería → Barberos: cada ficha puede subir o reemplazar la fotografía del profesional.
- Superadmin: registra barberías, opcionalmente invita/asigna propietario por correo, activa/suspende negocios, abre su página pública y edita logo, portada y descripción.
- Citas y calendario: botones para abrir WhatsApp con un mensaje preparado. El usuario confirma y envía el mensaje desde WhatsApp.

## WhatsApp

La función incluida abre `https://wa.me/` y no realiza envíos silenciosos ni automáticos. Para automatizar recordatorios se necesita WhatsApp Business Platform, un número habilitado, token privado, plantillas aprobadas, consentimiento adecuado y webhooks. Esa integración no está conectada en esta versión.

## Validación

Se ejecutaron las 6 pruebas existentes de utilidades y se revisó la sintaxis JS/JSX y las importaciones locales. No se pudo ejecutar `next build` en el entorno de edición porque no fue posible instalar dependencias desde npm. Tampoco se ejecutó la migración contra una base Supabase real. Ejecuta `npm install`, `npm run build` y prueba la migración primero en un proyecto Supabase de desarrollo antes de producción.
