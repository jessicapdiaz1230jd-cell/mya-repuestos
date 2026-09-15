"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RepairSystem from "./repair-system";

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string; app_metadata?: { role?: string }; user_metadata?: { name?: string } };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const storageKey = "mya_session";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) { queueMicrotask(() => setReady(true)); return; }
    const raw = localStorage.getItem(storageKey);
    queueMicrotask(() => {
      if (raw) try { setSession(JSON.parse(raw) as Session); } catch { localStorage.removeItem(storageKey); }
      setReady(true);
    });
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { apikey: supabaseKey!, "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }),
      });
      const result = await response.json() as Session & { error_description?: string; msg?: string };
      if (!response.ok) throw new Error(result.error_description || result.msg || "Correo o contraseña incorrectos.");
      const stored = { ...result, expires_at: Math.floor(Date.now() / 1000) + Number((result as unknown as { expires_in?: number }).expires_in ?? 3600) };
      localStorage.setItem(storageKey, JSON.stringify(stored)); setSession(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión."); }
    finally { setLoading(false); }
  }

  function logout() { localStorage.removeItem(storageKey); setSession(null); }
  if (!ready) return <div className="auth-loading"><LoaderCircle className="spin" /></div>;
  if (!supabaseUrl || !supabaseKey) return <RepairSystem />;
  if (session) return <RepairSystem accessToken={session.access_token} user={{
    name: session.user.user_metadata?.name || session.user.email || "Usuario",
    email: session.user.email || "",
    role: session.user.app_metadata?.role || "recepcion",
  }} onLogout={logout} />;

  return <main className="login-page">
    <section className="login-card">
      <div className="login-brand"><img src="/api/logo" alt="Logo M&A Repuestos" /><div><strong>M&A</strong><span>REPUESTOS</span></div></div>
      <div className="login-copy"><p>ACCESO SEGURO</p><h1>Bienvenido al taller</h1><span>Ingresa con el usuario creado por tu administrador. Esta cuenta es independiente de ChatGPT.</span></div>
      <form onSubmit={login} className="login-form">
        <div><Label htmlFor="login-email">Correo electrónico</Label><Input id="login-email" name="email" type="email" autoComplete="email" placeholder="usuario@empresa.com" required /></div>
        <div><Label htmlFor="login-password">Contraseña</Label><div className="password-input"><Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar contraseña">{showPassword ? <EyeOff /> : <Eye />}</button></div></div>
        {error && <div className="login-error">{error}</div>}
        <Button className="primary-action login-button" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <LogIn />} Ingresar</Button>
      </form>
      <footer><ShieldCheck /> Información protegida y guardada en la nube</footer>
    </section>
    <aside className="login-visual"><div><LockKeyhole /><h2>Tu negocio, bajo tu control.</h2><p>Órdenes, clientes, fotografías, pagos y garantías disponibles desde celular o computador.</p></div></aside>
  </main>;
}
