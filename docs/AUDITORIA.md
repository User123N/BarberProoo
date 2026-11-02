# Auditoría Fase 1 — BarberPro (estado del ZIP recibido)

Alcance revisado: 41 archivos (Next.js 15 App Router, JavaScript, Supabase SSR, 2 migraciones SQL, ~1.000 líneas de app).
Limitación de esta sesión: sin red ni Postgres, por lo que **no se ejecutó `npm install`, `next build` ni SQL**. Todo lo marcado "corregido" está sin probar en ejecución salvo `safeNext` (7/7 casos probados con Node).

## Lo que está bien (se conserva)
- Aislamiento por `business_id` con claves foráneas compuestas `(id, business_id)`: impide mezclar tenants entre tablas.
- RLS activado en las 34 tablas; sin políticas de escritura para `payments`, `subscriptions`, `invoices` (sólo service role).
- Restricción de exclusión GiST anti-solapamiento por barbero (doble reserva bloqueada en BD, no sólo en JS).
- `create_public_booking` valida negocio/servicio/barbero en servidor; cliente anónimo no lee `customers`/`appointments`.
- Registro público desactivado; `platform_role` no se asigna desde el frontend.

## Hallazgos críticos (seguridad)
| # | Hallazgo | Estado |
|---|----------|--------|
| C1 | Open redirect en login: `next="//evil.com"` pasaba el chequeo `startsWith("/")` | Corregido (`safe-redirect.js`) |
| C2 | Un owner/admin podía poner `status='active'` en su negocio suspendido (política `businesses_update`) y cambiar su slug | Corregido en 004 (trigger) |
| C3 | Un `admin` podía crear/promover owners (escalada de privilegios en `business_members`) | Corregido en 004 (trigger) |
| C4 | Cualquier miembro (incl. barbero) podía insertar/editar/borrar `appointment_items` (precios) y `appointment_events` (historial) | Corregido en 004 |
| C5 | `anon` podía leer todas las columnas de `businesses` (email), `barbers` (`profile_id`) y listar todos los tenants | Corregido en 004 (grants por columna) — verificar que la página pública siga cargando |
| C6 | Puntos de fidelización editables directamente por admin desde el navegador | Corregido en 004 (sólo lectura) |
| C7 | Galería pública visible aunque el negocio esté suspendido | Corregido en 004 |
| C8 | `audit_logs` sin ningún escritor; cambios de estado de cita sin historial | Corregido en 004 (triggers; DELETE pendiente) |

## Hallazgos funcionales graves (NO corregidos aún)
1. **Reservas a cualquier hora**: el formulario usa `<input type="time">` libre; el RPC no consulta `working_hours`, `schedule_exceptions`, `blocked_times` ni `business_holidays`. Se puede reservar a las 3 a. m. o en vacaciones. (Fase 5)
2. El barbero no necesita estar habilitado para el servicio (`barber_services` no se consulta).
3. Zona horaria fija `-05:00` en el navegador; `businesses.timezone` se ignora.
4. Sin límite de solicitudes ni caducidad de pendientes (`expires_at` sin uso): un anónimo puede llenar la agenda de citas "pendientes".
5. "Código de reserva" = 8 primeros hex del UUID; no se guarda ni permite consulta/cancelación.
6. Teléfono sin normalizar: "300 000 0000" y "3000000000" crean clientes distintos.
7. Todos los miembros (incl. barbero) leen PII de todos los clientes; el barbero no puede marcar sus propias citas como completadas. (Roles, Fase 4)
8. Las estadísticas del panel cuentan sólo las 100 filas cargadas ("Reservas: 100" aunque haya 500): dato engañoso. Sin paginación.
9. `role` llega a `Manage` pero se ignora; no hay selector si el usuario tiene varios negocios; servicios/barberos no se pueden reactivar ni editar.
10. `/client` y `/superadmin` están protegidos por middleware pero no existen; no hay chequeo de rol, sólo de sesión.
11. No hay recuperación de contraseña, onboarding, `loading/error/not-found`, `robots`, `manifest`.
12. La landing promete fidelización, notificaciones y "varios locales" que no existen, y muestra cifras "demo" (rotuladas como ilustrativas).

## Base de datos — cobertura frente al prompt
Existe: perfiles, negocios, miembros, ajustes, dominios, barberos, servicios, clientes, citas, pagos, planes, suscripciones, facturas, horarios/excepciones/bloqueos/festivos, lista de espera, fidelización básica, reseñas, galería, notificaciones, auditoría.
**Falta**: sucursales, inventario/proveedores/productos/POS, caja, comisiones, cupones, membresías, bonos, referidos, automatizaciones, asistencia, propinas, soporte, ajustes de plataforma, límites por plan (`plans` sólo tiene un precio y un JSON libre; sin precio anual ni cuotas), modelo de roles completo (añadidos `manager`/`receptionist` en 003; `client` y permisos finos pendientes).
Además: la restricción anti-solapamiento no incluye tiempos de preparación/limpieza ni bloqueos/vacaciones; `001` no es idempotente; `btree_gist` queda en `public`; no hay `supabase/config.toml` ni CLI de migraciones.

## Otros
- Código de `dashboard/manage.js` y `setup/page.js` minificado en pocas líneas: difícil de mantener; dividir por módulos.
- `lucide-react`, `zod` instalados sin uso; `createAdminClient` sin uso y `SUPABASE_SERVICE_ROLE_KEY` ausente de `.env.example`.
- Fuentes vía `@import` CSS (bloquea render): migrar a `next/font`.
- Sin pruebas ni CI. Sin CSP (pendiente de probar).
- `setup_first_owner.sql` guarda el nombre del negocio como nombre de la persona.

## Plan propuesto (orden de ejecución)
- **F1 (en curso)**: 003/004, redirect, cabeceras. Pendiente: probar en Supabase de pruebas; `supabase/config.toml`; pruebas RLS.
- **F4a**: roles y permisos finos + modelo de planes con límites verificados en servidor.
- **F5 (prioridad de negocio)**: disponibilidad real (RPC de slots con horarios, descansos, festivos, buffers, tz), reserva con código único, rate limit, caducidad, panel de calendario.
- **F2/F3**: rediseño, 3D diferido (lazy), superadmin.
- **F6–F10**: operaciones, CRM, IA, pagos Wompi con webhook firmado, pruebas, despliegue.

## Decisiones que necesito del propietario
1. Nombres/estructura de planes: el prompt define dos esquemas (Gratis/Básico/Profesional/Empresarial/Personalizado y Starter/Professional/Business/Enterprise).
2. Pasarela: Wompi (cuenta y llaves necesarias) o Mercado Pago.
3. Proveedor de correo (p. ej. Resend) y de IA (costo por consumo).
4. ¿Registro público de barberías con verificación (self-service) o sólo alta por superadmin?


---
## Actualización — correcciones de la lista de pendientes (sin verificar en ejecución)
| Pendiente | Estado |
|---|---|
| 1 Reservas a cualquier hora | Corregido en 005 (`is_slot_valid` + `get_available_slots`) y formulario con horarios reales |
| 2 Barbero habilitado para el servicio | Corregido (`barber_offers_service`, editable en Barberos → Servicios) |
| 3 Zona horaria fija | Corregido: usa `businesses.timezone` en SQL y en la interfaz |
| 4 Sin límite ni caducidad | Corregido: límite por IP/acción, máx. 3 reservas activas por cliente, pendientes caducan (ajustable) |
| 5 Código de reserva | Corregido: código único de 8 caracteres; consultar/cancelar/reprogramar en `/reserva` |
| 6 Teléfono sin normalizar | Corregido: `phone_digits` generado y búsqueda por dígitos |
| 7 Roles | Corregido en 005: gerente, recepción y barbero con RLS propio; el barbero sólo ve sus citas/clientes y sólo cambia el estado |
| 8 Estadísticas del panel | Corregido: conteos exactos y paginación |
| 9 Panel por rol / varios negocios / editar y reactivar | Corregido |
| 10 `/client`, `/superadmin` | `/superadmin` creado (listar, activar, suspender; datos reales). `/client` retirado: aún no existen cuentas de cliente; `/reserva` cubre el caso sin cuenta |
| 11 Recuperación de contraseña, loading/error/404, robots, manifest | Creados |
| 12 Landing con funciones inexistentes | Reescrita: separa "disponible hoy" de "en desarrollo" |
| Otros | Fuentes con `next/font`, dependencias sin uso retiradas, `setup_first_owner.sql` corregido, pruebas de utilidades (6/6) |

**Siguen pendientes (no son defectos, son módulos por construir):** sucursales, inventario/POS, caja, comisiones, cupones, membresías, automatizaciones, planes con límites aplicados en servidor, pagos, calendario visual, IA, rediseño 3D, CSP, auditoría de DELETE, buffers de preparación/limpieza en la restricción de solapamiento, plan de pruebas end-to-end.
