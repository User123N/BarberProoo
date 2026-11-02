"use client";
import { useState } from "react";
import { tabsFor, ROLE_LABELS } from "@/lib/roles";
import Icon from "@/components/Icons";
import OverviewTab from "./tabs/overview-tab";
import AppointmentsTab from "./tabs/appointments-tab";
import CalendarTab from "./tabs/calendar-tab";
import CustomersTab from "./tabs/customers-tab";
import ServicesTab from "./tabs/services-tab";
import ProductsTab from "./tabs/products-tab";
import BarbersTab from "./tabs/barbers-tab";
import HoursTab from "./tabs/hours-tab";
import SettingsTab from "./tabs/settings-tab";

const TABS = {
  overview: OverviewTab, calendar: CalendarTab, appointments: AppointmentsTab, customers: CustomersTab, services: ServicesTab, products: ProductsTab,
  barbers: BarbersTab, hours: HoursTab, settings: SettingsTab
};

export default function Manage({ business, role }) {
  const nav = tabsFor(role);
  if (["owner", "admin", "manager"].includes(role)) nav.unshift(["overview", "Resumen"], ["calendar", "Calendario"]);
  const [tab, setTab] = useState(nav[0][0]);
  const Active = TABS[tab];
  const today = new Date().toLocaleDateString("es-CO", { timeZone: business.timezone || "America/Bogota", weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="manage-wrap">
      <aside className="manage-side">
        <div className="side-brand">
          {business.logo_url ? <img src={business.logo_url} alt="" width="44" height="44" /> : <span className="side-monogram">{business.name.slice(0, 1).toUpperCase()}</span>}
          <div><h2>{business.name}</h2><div className="manage-slug">/{business.slug} · {ROLE_LABELS[role] || role}</div></div>
        </div>
        <nav className="side-nav" aria-label="Secciones del panel">
          {nav.map(([k, v]) => (
            <button key={k} className={tab === k ? "side-link active" : "side-link"} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}>
              <Icon name={k} size={18} /><span>{v}</span>
            </button>
          ))}
        </nav>
        <a className="side-link side-external" href={`/${business.slug}`} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={18} /><span>Ver página pública</span>
        </a>
      </aside>
      <section className="manage-main">
        <div className="manage-head">
          <div><div className="manage-date">{today}</div><h1>{nav.find((x) => x[0] === tab)?.[1]}</h1></div>
        </div>
        <div className="tab-panel" key={tab}><Active business={business} role={role} /></div>
      </section>
    </div>
  );
}
