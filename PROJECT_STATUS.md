# Estado de BarberPro

## Incluido en este paquete
- Next.js App Router y clientes Supabase SSR/browser.
- Autenticación y ruta privada `/dashboard`.
- Catálogo público por slug y formulario de reserva.
- RPC SQL para crear reservas pendientes con validación de negocio/servicio/barbero y prevención de solapamientos.
- Panel para listar y actualizar citas, administrar servicios y barberos y consultar clientes.
- Guía de configuración, SQL inicial de propietario y configuración Netlify.

## No certificado como producción
No se ha ejecutado contra un proyecto Supabase real ni se ha desplegado en una cuenta Netlify. Falta probar políticas RLS con usuarios anon/authenticated, reglas de horarios, zona horaria por negocio, notificaciones, pagos, límites antiabuso y pruebas end-to-end.

## Fase 1 (auditoría) — ver docs/AUDITORIA.md
Corregido sin ejecutar contra Supabase real: open redirect, cabeceras HTTP, migraciones 003/004. Pendiente de verificación: build, RLS y página pública tras los grants por columna.

## Fase 1b — disponibilidad, reservas y roles
Migraciones 003–005, panel por módulos, reserva con horarios reales, /reserva, /superadmin, recuperación de contraseña. Sin build ni SQL ejecutados: ver docs/AUDITORIA.md (sección Actualización) y supabase/tests/.

## Actualización de diseño y operación (Fase 2 parcial)
- Añadido calendario visual día/semana/mes por barbero con detalle de cita y acceso de contacto por WhatsApp.
- Ajustes de barbería ampliados con logo, portada, descripción, teléfono, dirección y ciudad.
- Fotos de barberos editables desde el panel.
- Superadmin puede registrar barberías mediante endpoint protegido, invitar propietario si está configurada la clave administrativa, suspender/activar cuentas y editar identidad visual de cada negocio.
- Añadida migración 006 para bucket de imágenes y políticas de Storage.
- CSP y cabeceras adicionales activadas.
- WhatsApp funciona como enlace de contacto iniciado por el usuario; no hay envío automático sin proveedor/API oficial.
- Pendiente: ejecutar migración 006 en Supabase, configurar SUPABASE_SERVICE_ROLE_KEY en servidor, pruebas reales de Storage/RLS y build/deploy.
