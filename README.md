# M&A Repuestos

Sistema web instalable para administrar clientes, órdenes de servicio técnico, diagnósticos, fotografías, cobros y garantías.

## Funciones

- Inicio de sesión independiente con correo y contraseña (Supabase Auth).
- Roles de Administrador, Recepción y Técnico.
- Historial de clientes y celulares.
- Fotografías de recepción y evidencia del servicio.
- Control de estados, cobros, saldos y garantías.
- Editor visual sin programación para mostrar, ocultar, renombrar, exigir y ordenar campos.
- Campos personalizados y selector de sección.
- Colores, fondo, tipografía y logo editables.
- Aplicación web progresiva (PWA), instalable desde celular o computador.

## Servicios necesarios

- Cloudflare Workers, D1 y R2 para publicar y guardar información/fotografías.
- Supabase Auth para usuarios y contraseñas.

## Configuración

1. Crea un proyecto en Supabase y obtén la URL, la clave `anon` y la clave `service_role`.
2. Crea en Supabase el primer usuario administrador. En sus metadatos de aplicación usa `{"role":"admin"}`.
3. Copia `.env.example` como `.env.local` para desarrollo.
4. Configura las mismas variables como secretos/variables del despliegue en Cloudflare.
5. Crea y enlaza una base D1 como `DB` y un bucket R2 como `FILES`.
6. Ejecuta las migraciones de la carpeta `drizzle/` en orden.

La clave `SUPABASE_SERVICE_ROLE_KEY` es secreta: nunca debe escribirse en archivos públicos ni usar el prefijo `NEXT_PUBLIC_`.

## Desarrollo

Requiere Node.js 22 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

Para comprobar la versión final:

```bash
pnpm exec tsc --noEmit
pnpm build
```

## Uso sencillo

Entra como Administrador y abre **Configuración**:

- **Formulario:** cambia qué datos se solicitan al crear una orden.
- **Apariencia:** cambia colores, letra y logo con una vista previa.
- **Usuarios:** crea accesos separados para empleados.

Los usuarios de Recepción y Técnico no ven el editor de configuración.
