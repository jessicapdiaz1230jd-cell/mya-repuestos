"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, BadgeCheck, Banknote, Camera, ChevronRight, FileClock,
  ImagePlus, LayoutDashboard, ListChecks, LogOut, Menu, PackageCheck, Palette,
  Plus, RefreshCw, Save, Search, Settings, ShieldCheck, Smartphone, Trash2,
  Type, UserPlus, Users, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultAppConfig, type AppConfig, type FormField } from "@/lib/app-config";
import type { CSSProperties } from "react";

type Order = {
  id: number; orderNumber: string; brand: string; model: string; imei: string;
  reportedIssue: string; diagnosis: string; status: string; total: number; paid: number;
  warrantyDays: number; createdAt: string; updatedAt: string; customerName: string;
  customerPhone: string; photoCount: number;
};
type Customer = { id: number; name: string; phone: string; document: string; email: string; orderCount: number; totalSpent: number; lastVisit: string | null };
type Metrics = { totalOrders: number; activeOrders: number; readyOrders: number; monthRevenue: number; pendingBalance: number };
type DashboardData = { orders: Order[]; customers: Customer[]; metrics: Metrics };
type OrderDetail = { order: Record<string, string | number | null>; photos: { id: number; phase: string; objectKey: string; filename: string }[] };
type View = "inicio" | "ordenes" | "clientes" | "garantias" | "configuracion";
type CurrentUser = { name: string; email: string; role: string };
type ManagedUser = { id: string; name: string; email: string; role: string; createdAt?: string };

const nav = [
  { id: "inicio" as View, label: "Inicio", icon: LayoutDashboard },
  { id: "ordenes" as View, label: "Órdenes", icon: Wrench },
  { id: "clientes" as View, label: "Clientes", icon: Users },
  { id: "garantias" as View, label: "Garantías", icon: ShieldCheck },
  { id: "configuracion" as View, label: "Configuración", icon: Settings },
];
const statuses = ["Recibido", "En diagnóstico", "Esperando aprobación", "En reparación", "Esperando repuesto", "Listo para entregar", "Entregado", "Cancelado"];
const emptyData: DashboardData = { orders: [], customers: [], metrics: { totalOrders: 0, activeOrders: 0, readyOrders: 0, monthRevenue: 0, pendingBalance: 0 } };
const formatMoney = (value: number | string | null | undefined) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "Sin registro";

function statusClass(status: string) {
  if (status === "Entregado") return "status status-green";
  if (status === "Listo para entregar") return "status status-blue";
  if (status === "Cancelado") return "status status-red";
  if (status.includes("Esperando")) return "status status-amber";
  return "status status-navy";
}

export default function RepairSystem({ accessToken = "", user = { name: "Administrador", email: "", role: "admin" }, onLogout }: { accessToken?: string; user?: CurrentUser; onLogout?: () => void }) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("inicio");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [config, setConfig] = useState<AppConfig>(defaultAppConfig);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);

  function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  }

  async function loadData() {
    setLoading(true);
    try {
      const [dashboardResponse, configResponse] = await Promise.all([
        authFetch("/api/dashboard", { cache: "no-store" }),
        authFetch("/api/settings", { cache: "no-store" }),
      ]);
      const result = await dashboardResponse.json() as DashboardData & { error?: string };
      const settingsResult = await configResponse.json() as { config?: AppConfig; error?: string };
      if (!dashboardResponse.ok) throw new Error(result.error || "No se pudo cargar la información.");
      if (!configResponse.ok) throw new Error(settingsResult.error || "No se pudo cargar la configuración.");
      setData(result); if (settingsResult.config) setConfig(settingsResult.config); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo cargar la información."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.orders;
    return data.orders.filter((order) => [order.orderNumber, order.customerName, order.customerPhone, order.brand, order.model, order.imei, order.status].some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [data.orders, search]);
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter((customer) => [customer.name, customer.phone, customer.document, customer.email].some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [data.customers, search]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await authFetch("/api/orders", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { orderNumber?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la orden.");
      setNewOrderOpen(false); setMessage(`Orden ${result.orderNumber} creada correctamente.`); await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar la orden."); }
    finally { setSaving(false); }
  }
  async function openOrder(id: number) {
    setDetailOpen(true); setSelected(null);
    try {
      const response = await authFetch(`/api/orders/${id}`); const result = await response.json() as OrderDetail & { error?: string };
      if (!response.ok) throw new Error(result.error); setSelected(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir la orden."); setDetailOpen(false); }
  }
  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setSaving(true);
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await authFetch(`/api/orders/${selected.order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error);
      setDetailOpen(false); setMessage("La orden se actualizó correctamente."); await loadData();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar la orden."); }
    finally { setSaving(false); }
  }
  async function updateLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await authFetch("/api/logo", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error);
      setLogoVersion(Date.now()); setMessage("El logo de M&A Repuestos se actualizó correctamente.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar el logo."); }
    finally { setSaving(false); }
  }
  async function saveConfig(next: AppConfig) {
    setSaving(true); setMessage("");
    try {
      const response = await authFetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const result = await response.json() as { config?: AppConfig; error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la configuración.");
      setConfig(result.config || next); setMessage("Configuración guardada. Los cambios ya se aplicaron al sistema.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración."); }
    finally { setSaving(false); }
  }
  async function loadUsers() {
    try {
      const response = await authFetch("/api/users", { cache: "no-store" });
      const result = await response.json() as { users?: ManagedUser[]; error?: string };
      if (!response.ok) throw new Error(result.error); setManagedUsers(result.users || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible cargar los usuarios."); }
  }
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await authFetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error);
      event.currentTarget.reset(); setMessage("Usuario creado correctamente."); await loadUsers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible crear el usuario."); }
    finally { setSaving(false); }
  }
  function changeView(next: View) { setView(next); setMobileMenu(false); setSearch(""); }
  const warrantyOrders = data.orders.filter((order) => order.status === "Entregado" && order.warrantyDays > 0);

  const visibleNav = user.role === "admin" ? nav : nav.filter((item) => item.id !== "configuracion");
  const themeStyle = {
    "--brand-sidebar": config.theme.sidebar, "--brand-background": config.theme.background,
    "--brand-primary": config.theme.primary, "--brand-surface": config.theme.surface,
    "--brand-text": config.theme.text, "--brand-muted": config.theme.muted,
    "--brand-accent": config.theme.accent, "--brand-font": config.theme.font,
  } as CSSProperties;
  return <div className="app-shell" style={themeStyle}>
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand-block"><div className="brand-logo"><img src={`/api/logo?v=${logoVersion}`} alt="Logo M&A Repuestos" /></div><div><strong>M&A</strong><span>REPUESTOS</span></div><button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú"><X /></button></div>
      <p className="sidebar-kicker">CENTRO DE SERVICIO</p>
      <nav>{visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "nav-active" : ""} onClick={() => changeView(id)}><Icon /><span>{label}</span>{view === id && <i />}</button>)}</nav>
      <div className="sidebar-card"><ShieldCheck /><div><b>Historial protegido</b><span>Toda la información queda guardada.</span></div></div>
      <div className="sidebar-user"><span>{user.name}</span><small>{user.role === "admin" ? "Administrador" : user.role === "tecnico" ? "Técnico" : "Recepción"}</small>{onLogout && <button onClick={onLogout} title="Cerrar sesión"><LogOut /></button>}</div>
      <div className="sidebar-footer"><span className="online-dot" /> Sistema operativo</div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menú"><Menu /></button>
        <div className="page-heading"><p>{view === "inicio" ? "PANEL PRINCIPAL" : "GESTIÓN"}</p><h1>{nav.find((item) => item.id === view)?.label}</h1></div>
        <div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, orden o IMEI" /></div>
        <Button className="primary-action" onClick={() => setNewOrderOpen(true)}><Plus /> Nueva orden</Button>
      </header>

      <div className="content-area">
        {message && <div className="notice"><BadgeCheck /><span>{message}</span><button onClick={() => setMessage("")}><X /></button></div>}
        {loading ? <LoadingState /> : <>
          {view === "inicio" && <Dashboard data={data} orders={filteredOrders} onOpen={openOrder} onNew={() => setNewOrderOpen(true)} />}
          {view === "ordenes" && <OrdersView orders={filteredOrders} onOpen={openOrder} onNew={() => setNewOrderOpen(true)} />}
          {view === "clientes" && <CustomersView customers={filteredCustomers} />}
          {view === "garantias" && <WarrantyView orders={warrantyOrders} onOpen={openOrder} />}
          {view === "configuracion" && user.role === "admin" && <SettingsView config={config} logoVersion={logoVersion} saving={saving} users={managedUsers} onLogo={updateLogo} onSave={saveConfig} onLoadUsers={loadUsers} onCreateUser={createUser} />}
        </>}
      </div>
    </main>
    {mobileMenu && <button className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}
    <NewOrderDialog config={config} open={newOrderOpen} setOpen={setNewOrderOpen} saving={saving} onSubmit={createOrder} />
    <OrderDialog config={config} accessToken={accessToken} open={detailOpen} setOpen={setDetailOpen} detail={selected} saving={saving} onSubmit={updateOrder} />
  </div>;
}

function LoadingState() { return <div className="loading-card"><RefreshCw className="spin" /><h2>Preparando tu panel</h2><p>Cargando órdenes, clientes e historial…</p></div>; }

function Dashboard({ data, orders, onOpen, onNew }: { data: DashboardData; orders: Order[]; onOpen: (id: number) => void; onNew: () => void }) {
  const cards = [
    { label: "Órdenes activas", value: data.metrics.activeOrders, icon: Wrench, tone: "navy" },
    { label: "Listas para entregar", value: data.metrics.readyOrders, icon: PackageCheck, tone: "blue" },
    { label: "Ingresos del mes", value: formatMoney(data.metrics.monthRevenue), icon: Banknote, tone: "green" },
    { label: "Saldo pendiente", value: formatMoney(data.metrics.pendingBalance), icon: FileClock, tone: "copper" },
  ];
  return <>
    <section className="welcome-row"><div><span className="eyebrow">M&A REPUESTOS</span><h2>Control total del taller</h2><p>Consulta el avance de cada reparación y conserva el historial completo de tus clientes.</p></div><button className="refresh-button" onClick={() => location.reload()}><RefreshCw /> Actualizar</button></section>
    <section className="stat-grid">{cards.map(({ label, value, icon: Icon, tone }) => <article className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon /></div><div><p>{label}</p><strong>{value}</strong></div></article>)}</section>
    <section className="panel orders-panel"><div className="panel-head"><div><p className="eyebrow">SEGUIMIENTO</p><h3>Órdenes recientes</h3></div><button onClick={onNew}><Plus /> Registrar equipo</button></div><OrderList orders={orders.slice(0, 8)} onOpen={onOpen} /></section>
  </>;
}

function OrdersView({ orders, onOpen, onNew }: { orders: Order[]; onOpen: (id: number) => void; onNew: () => void }) {
  return <section className="panel orders-panel full-panel"><div className="panel-head"><div><p className="eyebrow">ÓRDENES DE SERVICIO</p><h3>Todos los equipos</h3><span>{orders.length} registros encontrados</span></div><button onClick={onNew}><Plus /> Nueva orden</button></div><OrderList orders={orders} onOpen={onOpen} /></section>;
}

function OrderList({ orders, onOpen }: { orders: Order[]; onOpen: (id: number) => void }) {
  if (!orders.length) return <EmptyState icon={Smartphone} title="Aún no hay órdenes" text="Registra el primer celular que ingrese al servicio técnico." />;
  return <div className="order-list">{orders.map((order) => <button className="order-row" key={order.id} onClick={() => onOpen(order.id)}><div className="device-icon"><Smartphone /></div><div className="order-main"><div><b>{order.brand} {order.model}</b><span>{order.orderNumber}</span></div><p>{order.customerName} · {order.customerPhone}</p><small>{order.reportedIssue}</small></div><div className="photo-count"><Camera /> {order.photoCount}</div><div className="order-total"><span>{formatMoney(order.total)}</span><small>{formatDate(order.createdAt)}</small></div><span className={statusClass(order.status)}>{order.status}</span><ChevronRight className="row-arrow" /></button>)}</div>;
}

function CustomersView({ customers }: { customers: Customer[] }) {
  return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">DIRECTORIO</p><h3>Clientes e historial</h3><span>{customers.length} clientes registrados</span></div></div>{!customers.length ? <EmptyState icon={Users} title="Tu directorio está vacío" text="Los clientes aparecerán automáticamente al crear una orden." /> : <div className="customer-grid">{customers.map((customer) => <article className="customer-card" key={customer.id}><div className="customer-avatar">{customer.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}</div><div className="customer-title"><h4>{customer.name}</h4><p>{customer.phone}</p></div><div className="customer-facts"><span><b>{customer.orderCount}</b> servicios</span><span><b>{formatMoney(customer.totalSpent)}</b> facturado</span></div><footer>Última visita: {formatDate(customer.lastVisit)}</footer></article>)}</div>}</section>;
}

function WarrantyView({ orders, onOpen }: { orders: Order[]; onOpen: (id: number) => void }) {
  return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">POSVENTA</p><h3>Control de garantías</h3><span>Trabajos entregados con garantía registrada</span></div></div>{!orders.length ? <EmptyState icon={ShieldCheck} title="No hay garantías registradas" text="Al entregar una orden, indica los días de garantía para verla aquí." /> : <div className="warranty-grid">{orders.map((order) => <button key={order.id} className="warranty-card" onClick={() => onOpen(order.id)}><ShieldCheck /><div><b>{order.brand} {order.model}</b><span>{order.customerName}</span><small>{order.warrantyDays} días de garantía</small></div><ChevronRight /></button>)}</div>}</section>;
}

function SettingsView({ config, logoVersion, saving, users, onLogo, onSave, onLoadUsers, onCreateUser }: { config: AppConfig; logoVersion: number; saving: boolean; users: ManagedUser[]; onLogo: (event: FormEvent<HTMLFormElement>) => void; onSave: (config: AppConfig) => void; onLoadUsers: () => void; onCreateUser: (event: FormEvent<HTMLFormElement>) => void }) {
  const [draft, setDraft] = useState(config);
  const [newField, setNewField] = useState({ label: "", type: "text", section: config.sections[0]?.id || "cliente" });
  function updateField(id: string, changes: Partial<FormField>) { setDraft((current) => ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...changes } : field) })); }
  function moveField(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const fields = [...current.fields]; const index = fields.findIndex((field) => field.id === id); const target = index + direction;
      if (index < 0 || target < 0 || target >= fields.length) return current;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields: fields.map((field, order) => ({ ...field, order: order + 1 })) };
    });
  }
  function addField() {
    const label = newField.label.trim(); if (!label) return;
    const id = `custom_${Date.now().toString(36)}`;
    setDraft((current) => ({ ...current, fields: [...current.fields, { id, label, type: newField.type as FormField["type"], section: newField.section, enabled: true, required: false, order: current.fields.length + 1, builtin: false }] }));
    setNewField((value) => ({ ...value, label: "" }));
  }
  const colorOptions: { key: keyof AppConfig["theme"]; label: string }[] = [
    { key: "sidebar", label: "Menú lateral" }, { key: "background", label: "Fondo de la página" },
    { key: "primary", label: "Botones principales" }, { key: "surface", label: "Tarjetas y formularios" },
    { key: "text", label: "Texto principal" }, { key: "muted", label: "Texto secundario" }, { key: "accent", label: "Detalles y acentos" },
  ];
  return <section className="panel settings-workspace"><div className="settings-heading"><div><p className="eyebrow">CENTRO DE CONFIGURACIÓN</p><h2>Personaliza tu sistema sin programar</h2><p>Activa, oculta, renombra y organiza campos; cambia el diseño y administra accesos.</p></div><Button className="primary-action" disabled={saving} onClick={() => onSave(draft)}>{saving ? <RefreshCw className="spin" /> : <Save />} Guardar cambios</Button></div>
    <Tabs defaultValue="formulario" className="settings-tabs"><TabsList className="settings-tab-list"><TabsTrigger value="formulario"><ListChecks /> Formulario</TabsTrigger><TabsTrigger value="apariencia"><Palette /> Apariencia</TabsTrigger><TabsTrigger value="usuarios" onClick={onLoadUsers}><Users /> Usuarios</TabsTrigger></TabsList>
      <TabsContent value="formulario"><div className="settings-intro"><h3>Datos que se piden al crear una orden</h3><p>Usa las flechas para cambiar el orden. “Visible” muestra el campo y “Obligatorio” exige completarlo.</p></div><div className="field-editor-list">{draft.fields.map((field, index) => <article className="field-editor" key={field.id}><div className="drag-buttons"><button disabled={index === 0} onClick={() => moveField(field.id, -1)} title="Subir"><ArrowUp /></button><button disabled={index === draft.fields.length - 1} onClick={() => moveField(field.id, 1)} title="Bajar"><ArrowDown /></button></div><div className="field-editor-main"><Input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} aria-label="Nombre del campo" /><select value={field.section} onChange={(event) => updateField(field.id, { section: event.target.value })}>{draft.sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></div><label className="switch-label"><Switch checked={field.enabled} onCheckedChange={(checked) => updateField(field.id, { enabled: checked })} /><span>Visible</span></label><label className="switch-label"><Switch checked={field.required} disabled={!field.enabled || field.type === "file"} onCheckedChange={(checked) => updateField(field.id, { required: checked })} /><span>Obligatorio</span></label>{!field.builtin ? <button className="delete-field" onClick={() => setDraft((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }))} title="Eliminar"><Trash2 /></button> : <span className="core-tag">Base</span>}</article>)}</div>
        <article className="add-field-card"><div><UserPlus /><span><b>Agregar otro dato</b><small>Crea un campo propio en segundos.</small></span></div><Input placeholder="Nombre del nuevo dato" value={newField.label} onChange={(event) => setNewField((value) => ({ ...value, label: event.target.value }))} /><select value={newField.type} onChange={(event) => setNewField((value) => ({ ...value, type: event.target.value }))}><option value="text">Texto corto</option><option value="textarea">Texto largo</option><option value="number">Número</option><option value="email">Correo</option></select><select value={newField.section} onChange={(event) => setNewField((value) => ({ ...value, section: event.target.value }))}>{draft.sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select><Button type="button" onClick={addField}><Plus /> Agregar</Button></article>
      </TabsContent>
      <TabsContent value="apariencia"><div className="appearance-grid"><div><div className="settings-intro"><h3>Colores y tipografía</h3><p>Selecciona un color o escribe su código. La vista previa cambia inmediatamente.</p></div><div className="color-grid">{colorOptions.map(({ key, label }) => <label className="color-control" key={key}><span>{label}</span><div><input type="color" value={String(draft.theme[key])} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, [key]: event.target.value } }))} /><Input value={String(draft.theme[key])} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, [key]: event.target.value } }))} /></div></label>)}</div><label className="font-control"><span><Type /> Tipo de letra</span><select value={draft.theme.font} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, font: event.target.value } }))}>{["Inter", "Arial", "Georgia", "Verdana", "Trebuchet MS"].map((font) => <option key={font}>{font}</option>)}</select></label><Button variant="outline" onClick={() => setDraft((current) => ({ ...current, theme: defaultAppConfig.theme }))}>Restablecer diseño</Button></div><div className="theme-preview" style={{ background: draft.theme.background, color: draft.theme.text, fontFamily: draft.theme.font }}><aside style={{ background: draft.theme.sidebar }}><img src={`/api/logo?v=${logoVersion}`} alt="Logo" /><i /><i /><i /></aside><div><span style={{ color: draft.theme.accent }}>VISTA PREVIA</span><h3>Panel de M&A Repuestos</h3><p style={{ color: draft.theme.muted }}>Así se verán los colores seleccionados.</p><section style={{ background: draft.theme.surface }}><b>Orden de servicio</b><button style={{ background: draft.theme.primary }}>Guardar</button></section></div></div></div><article className="logo-settings"><div><h3>Logo de la empresa</h3><p>Puedes reemplazarlo cuando quieras. Formatos JPG, PNG o WEBP.</p></div><img src={`/api/logo?v=${logoVersion}`} alt="Logo actual" /><form onSubmit={onLogo}><Input name="logo" type="file" accept="image/*" required /><Button disabled={saving}><ImagePlus /> Actualizar logo</Button></form></article></TabsContent>
      <TabsContent value="usuarios"><div className="users-layout"><article><div className="settings-intro"><h3>Usuarios con acceso</h3><p>Cada persona entra con su propio correo y contraseña, sin usar ChatGPT.</p></div><div className="user-list">{users.length ? users.map((item) => <div key={item.id}><span className="user-avatar">{(item.name || item.email).slice(0, 2).toUpperCase()}</span><span><b>{item.name || "Usuario"}</b><small>{item.email}</small></span><em>{item.role === "admin" ? "Administrador" : item.role === "tecnico" ? "Técnico" : "Recepción"}</em></div>) : <p className="users-empty">Pulsa esta pestaña para cargar los usuarios. Si aún no conectaste Supabase, la lista se habilitará al publicarla de forma independiente.</p>}</div></article><form className="create-user-card" onSubmit={onCreateUser}><UserPlus /><h3>Crear usuario</h3><p>La persona podrá entrar de inmediato con estos datos.</p><Label>Nombre</Label><Input name="name" required placeholder="Nombre completo" /><Label>Correo</Label><Input name="email" type="email" required placeholder="usuario@empresa.com" /><Label>Contraseña temporal</Label><Input name="password" type="password" minLength={8} required placeholder="Mínimo 8 caracteres" /><Label>Permiso</Label><select name="role" defaultValue="recepcion"><option value="recepcion">Recepción</option><option value="tecnico">Técnico</option><option value="admin">Administrador</option></select><Button className="primary-action" disabled={saving}><UserPlus /> Crear acceso</Button></form></div></TabsContent>
    </Tabs>
  </section>;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Smartphone; title: string; text: string }) { return <div className="empty-state"><div><Icon /></div><h4>{title}</h4><p>{text}</p></div>; }
function Field({ label, name, required = false, type = "text", placeholder = "", defaultValue }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string }) { return <div className="field"><Label htmlFor={name}>{label}{required && <em>*</em>}</Label><Input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} /></div>; }

function NewOrderDialog({ config, open, setOpen, saving, onSubmit }: { config: AppConfig; open: boolean; setOpen: (open: boolean) => void; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const sectionIcons: Record<string, typeof Users> = { cliente: Users, equipo: Smartphone, recepcion: Wrench, cotizacion: Banknote, evidencias: Camera };
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="order-dialog" showCloseButton><DialogHeader><DialogDescription>NUEVA ORDEN DE SERVICIO</DialogDescription><DialogTitle>Registrar ingreso del equipo</DialogTitle></DialogHeader><form onSubmit={onSubmit} className="order-form">
    {[...config.sections].sort((a, b) => a.order - b.order).map((section) => {
      const fields = config.fields.filter((field) => field.enabled && field.section === section.id).sort((a, b) => a.order - b.order); if (!fields.length) return null;
      const Icon = sectionIcons[section.id] || ListChecks;
      return <fieldset key={section.id}><legend><Icon /> {section.label}</legend><div className="form-grid">{fields.map((field) => {
        const name = field.builtin ? field.id : `custom:${field.id}`;
        if (field.type === "file") return <div className="upload-zone form-span" key={field.id}><ImagePlus /><div><b>{field.label}</b><span>Pantalla, parte trasera, laterales y daños visibles · máximo 8</span></div><Input name={name} type="file" accept="image/*" multiple /></div>;
        if (field.type === "textarea") return <div className="field form-span" key={field.id}><Label htmlFor={name}>{field.label}{field.required && <em>*</em>}</Label><Textarea id={name} name={name} required={field.required} placeholder={field.placeholder} /></div>;
        return <Field key={field.id} label={field.label} name={name} required={field.required} type={field.type} placeholder={field.placeholder} />;
      })}</div></fieldset>;
    })}
    <div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="primary-action">{saving ? <RefreshCw className="spin" /> : <Plus />} Crear orden</Button></div>
  </form></DialogContent></Dialog>;
}

function ProtectedImage({ src, accessToken, alt }: { src: string; accessToken: string; alt: string }) {
  const [url, setUrl] = useState(accessToken ? "" : src);
  useEffect(() => {
    if (!accessToken) return;
    let objectUrl = ""; fetch(src, { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.blob()).then((blob) => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, accessToken]);
  return url ? <img src={url} alt={alt} /> : <span className="image-loading"><RefreshCw className="spin" /></span>;
}

function OrderDialog({ config, accessToken, open, setOpen, detail, saving, onSubmit }: { config: AppConfig; accessToken: string; open: boolean; setOpen: (open: boolean) => void; detail: OrderDetail | null; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const order = detail?.order;
  let customEntries: [string, string][] = [];
  try {
    const values = JSON.parse(String(order?.custom_data ?? "{}")) as Record<string, string>;
    customEntries = Object.entries(values).filter(([, value]) => value).map(([id, value]) => [config.fields.find((field) => field.id === id)?.label || id, value]);
  } catch { customEntries = []; }
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="detail-dialog">{!order ? <LoadingState /> : <><DialogHeader><DialogDescription>{String(order.order_number)}</DialogDescription><DialogTitle>{String(order.brand)} {String(order.model)}</DialogTitle></DialogHeader><div className="detail-summary"><div><span>Cliente</span><b>{String(order.customerName)}</b><small>{String(order.customerPhone)}</small></div><div><span>Falla reportada</span><b>{String(order.reported_issue)}</b></div><div><span>Fecha de ingreso</span><b>{formatDate(String(order.created_at))}</b></div></div>{customEntries.length > 0 && <div className="custom-detail">{customEntries.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>}{detail?.photos.length ? <div className="photo-strip">{detail.photos.map((photo) => <ProtectedImage key={photo.id} accessToken={accessToken} src={`/api/files/${photo.objectKey}`} alt={photo.filename} />)}</div> : <div className="no-photos"><Camera /> Sin fotografías de recepción</div>}
    <form onSubmit={onSubmit} className="detail-form"><div className="form-grid"><div className="field"><Label htmlFor="status">Estado</Label><select id="status" name="status" defaultValue={String(order.status)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><Field label="Técnico" name="technician" defaultValue={String(order.technician ?? "")} /></div><div className="field"><Label htmlFor="diagnosis">Diagnóstico técnico</Label><Textarea id="diagnosis" name="diagnosis" defaultValue={String(order.diagnosis ?? "")} placeholder="Falla encontrada y pruebas realizadas" /></div><div className="field"><Label htmlFor="workPerformed">Trabajo realizado</Label><Textarea id="workPerformed" name="workPerformed" defaultValue={String(order.work_performed ?? "")} placeholder="Reparación y repuestos instalados" /></div><div className="form-grid three"><div className="field"><Label htmlFor="total">Valor total</Label><Input id="total" name="total" type="number" defaultValue={Number(order.total)} /></div><div className="field"><Label htmlFor="paid">Valor pagado</Label><Input id="paid" name="paid" type="number" defaultValue={Number(order.paid)} /></div><div className="field"><Label htmlFor="warrantyDays">Garantía (días)</Label><Input id="warrantyDays" name="warrantyDays" type="number" defaultValue={Number(order.warranty_days)} /></div></div><div className="field"><Label htmlFor="paymentMethod">Forma de pago</Label><Input id="paymentMethod" name="paymentMethod" defaultValue={String(order.payment_method ?? "")} placeholder="Efectivo, transferencia…" /></div><div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button><Button type="submit" disabled={saving} className="primary-action">{saving ? <RefreshCw className="spin" /> : <BadgeCheck />} Guardar cambios</Button></div></form>
  </>}</DialogContent></Dialog>;
}
