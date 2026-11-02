-- BarberPro 003: amplía los roles de miembro (owner, admin, barber ya existen).
-- Va SEPARADO de 004 porque un valor nuevo de enum no puede usarse en la misma transacción.
-- Ejecutar ANTES de 004. Seguro de repetir.
alter type public.member_role add value if not exists 'manager';
alter type public.member_role add value if not exists 'receptionist';
