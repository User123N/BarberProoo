"use client";
import { useState } from "react";
import { tabsFor, ROLE_LABELS } from "@/lib/roles";
import AppointmentsTab from "./tabs/appointments-tab";
import CalendarTab from "./tabs/calendar-tab";
import CustomersTab from "./tabs/customers-tab";
import ServicesTab from "./tabs/services-tab";
import BarbersTab from "./tabs/barbers-tab";
import HoursTab from "./tabs/hours-tab";
import SettingsTab from "./tabs/settings-tab";

const TABS = {
  calendar: CalendarTab, appointments: AppointmentsTab, customers: CustomersTab, services: ServicesTab,
  barbers: BarbersTab, hours: HoursTab, settings: SettingsTab
};

export default function Manage({ business, role }) {
  const nav = tabsFor(role);
  if (["owner", "admin", "manager"].includes(role)) nav.unshift(["calendar", "Calendario"]);
  const [tab, setTab] = useState(nav[0][0]);
  const Active = TABS[tab];
  return (
    <div className="manage-wrap">
      <aside className="manage-side">
        <div className="eyebrow">GESTIÓN DEL NEGOCIO</div>
        <h2>{business.name}</h2>
        <div className="manage-slug">/{business.slug} · {ROLE_LABELS[role] || role}</div>
        {nav.map(([k, v]) => (
          <button key={k} className={tab === k ? "side-link active" : "side-link"} onClick={() => setTab(k)}>{v}</button>
        ))}
        <a className="side-link" href={`/${business.slug}`} target="_blank" rel="noopener noreferrer">Ver página pública ↗</a>
      </aside>
      <section className="manage-main">
        <div className="manage-head">
          <div><div className="eyebrow">PANEL DE CONTROL</div><h1>{nav.find((x) => x[0] === tab)?.[1]}</h1></div>
        </div>
        <Active business={business} role={role} />
      </section>
    </div>
  );
}
