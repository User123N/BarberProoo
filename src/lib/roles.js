/** Permisos de interfaz por rol. La seguridad real vive en RLS/triggers; esto sólo decide qué se muestra. */
export const ROLE_LABELS = {
  owner: "Propietario", admin: "Administrador", manager: "Gerente", receptionist: "Recepción", barber: "Barbero"
};
export const canManage = (role) => ["owner", "admin", "manager"].includes(role);
export const isStaff = (role) => canManage(role) || role === "receptionist";
export const canEditSettings = (role) => ["owner", "admin"].includes(role);

export function tabsFor(role) {
  const tabs = [["appointments", "Citas"]];
  if (isStaff(role)) tabs.push(["customers", "Clientes"]);
  if (canManage(role)) tabs.push(["services", "Servicios"], ["barbers", "Barberos"], ["hours", "Horarios"]);
  if (canEditSettings(role)) tabs.push(["products", "Productos"]);
  if (canEditSettings(role)) tabs.push(["settings", "Ajustes"]);
  return tabs;
}
