# Auditoría Unlighthouse — Primera Riverada Los 4 Ases

**Fecha de preparación:** 2026-07-11
**Objetivo:** establecer una auditoría reproducible de rendimiento, accesibilidad, buenas prácticas y SEO para las rutas públicas y autenticadas de `https://primerariveradalos4ases.com`.

> **Estado de esta ejecución:** línea base pública completada el 2026-07-11 con Unlighthouse CLI 0.18.0 y Lighthouse 13.4.0. Se analizaron las 8 URLs descubiertas desde el sitemap, con una única muestra por URL. Las rutas autenticadas siguen pendientes: no había entorno local activo ni una sesión de auditoría autorizada.

> **Corrección preparada, pendiente de despliegue:** la ruta `/recovery` ahora define metadata propia que reemplaza el `noindex` heredado del área de autenticación. Tras desplegarla, repetir su auditoría para verificar que SEO sube de 63/100; no se declara corregido en producción antes de esa comprobación.

## Resumen de ejecución real

- Comando ejecutado: `npx --yes unlighthouse --site https://primerariveradalos4ases.com/ --output-path /tmp/opencode/unlighthouse-production --samples 1`.
- Entorno: Chromium del sistema (`/usr/bin/chromium`), producción, una muestra por ruta. Son métricas de laboratorio, no Core Web Vitals de usuarios reales.
- Descubrimiento: `robots.txt` y un sitemap; 7 URLs iniciales y 8 rutas auditadas después del rastreo.
- Artefactos HTML, JSON y capturas: `/tmp/opencode/unlighthouse-production/primerariveradalos4ases.com/fd28/`. Están fuera de Git y son efímeros.
- Durante la ejecución se informaron errores de mapeo en varios source maps de `/_next/static/chunks/*.js.map`. No abortaron la auditoría, pero deben corregirse o excluirse de la publicación de source maps para facilitar depuración.

| URL | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 99 | 96 | 100 | 100 | 1.5 s | 1.8 s | 0 ms | 0 |
| `/login/player` | 96 | 100 | 96 | 100 | 2.1 s | 2.2 s | 0 ms | 0.002 |
| `/register/player` | 99 | 100 | 96 | 100 | 1.2 s | 2.1 s | 0 ms | 0 |
| `/recovery` | 100 | 100 | 96 | 63 | 1.2 s | 1.5 s | 0 ms | 0.014 |
| `/privacy` | 100 | 94 | 100 | 100 | 1.1 s | 1.6 s | 0 ms | 0 |
| `/rules` | 100 | 93 | 100 | 100 | 1.1 s | 1.6 s | 0 ms | 0 |
| `/security-policy` | 100 | 94 | 100 | 100 | 1.2 s | 1.7 s | 0 ms | 0 |
| `/terms` | 100 | 94 | 100 | 100 | 1.2 s | 1.6 s | 0 ms | 0 |

## Hallazgos verificados

1. **P1 — Accesibilidad en la portada y páginas legales.** Lighthouse detectó contraste insuficiente en `/`, `/privacy`, `/rules`, `/security-policy` y `/terms`. Las cuatro rutas legales también carecen de un único landmark `main`. Corregir los tokens/colores involucrados y envolver el contenido principal en `<main>`.
2. **P1 — SEO de `/recovery`: 63/100.** La auditoría marca la página como bloqueada para indexación. Confirmar que el `noindex` es intencional para recuperación de cuenta; si lo es, esta puntuación no requiere corrección.
3. **P2 — Caché de navegación.** Las 8 rutas impiden restaurar la página desde bfcache, con dos razones informadas por Lighthouse. Inspeccionar el detalle de cada JSON antes de cambiar listeners de ciclo de vida o cabeceras.
4. **P2 — JavaScript no usado.** Estimación: 28–29 KiB en páginas legales y portada; 78 KiB en recuperación; 132–133 KiB en login/registro. Priorizar división de código en las pantallas de autenticación.
5. **P2 — JavaScript heredado y solicitudes bloqueantes.** Lighthouse estima 14 KiB de JavaScript heredado en todas las rutas, y hasta 440 ms de ahorro por recursos bloqueantes en `/`. Validar el árbol de dependencias de los artefactos antes de optimizar.
6. **P2 — Incidencias DevTools en autenticación.** Login, registro y recuperación registraron incidencias en el panel Issues de Chrome. Revisarlas en los informes JSON/HTML: esta auditoría no determina su causa.

## Alcance y fuentes de rutas

La fuente de verdad del inventario es [`docs/product/ROUTES.md`](../../product/ROUTES.md), contrastada con `apps/web/src/app`. El sitemap de producción (`apps/web/src/app/sitemap.ts`) solo publica `/`, `/login/player`, `/register/player`, `/rules`, `/privacy`, `/terms` y `/security-policy`; por tanto, no basta para declarar una auditoría completa.

- **Públicas:** se auditan en producción y local.
- **Pantallas de autenticación y recuperación:** se auditan como públicas cuando renderizan sin sesión; no se usa un OTP ni un PIN real para el rastreo.
- **Aplicación de jugador y administración:** requieren una cuenta de prueba de mínimo privilegio y se auditan localmente. No usar cuentas productivas, con dinero, ni con permisos operativos.
- **Rutas dinámicas:** se cubren con identificadores de una fixture local desechable. No se deben enumerar identificadores reales ni datos personales.

## Método reproducible y seguro

### 1. Preparar el entorno sin exponer secretos

1. Usar Node.js 24 y pnpm 11, las versiones canónicas del repositorio.
2. Crear `.env.local` solo en la máquina del auditor a partir de `.env.example`; no copiarlo, imprimirlo ni subirlo.
3. Preparar dos usuarios locales de prueba: `player-audit` sin saldo ni participación activa y `admin-audit` con rol de solo lectura. Los flujos que mutan dinero, sanciones, mensajes o mesas quedan fuera de la auditoría.
4. Mantener sesiones, informes y trazas fuera de Git. `.gitignore` ya excluye `.playwright/` y `.unlighthouse/`.

### 2. Descubrir y fijar el inventario antes de medir

```bash
# Sitemap que descubre Unlighthouse en producción; no sustituye el mapa de rutas.

# Inventario local completo: rutas estáticas y plantillas dinámicas del App Router.
find apps/web/src/app -name page.tsx -print | sort

# Contrastar el resultado anterior con el mapa mantenido por el producto.
```

El primer comando es también la auditoría base de producción: guardar su salida bajo `.unlighthouse/` y conservar la fecha, commit, versión de Node/pnpm y URL base junto al informe exportado. Antes de ejecutarlo, revisar las URLs descubiertas: el crawler no debe seguir dominios externos ni URLs con parámetros de sesión.

Para cada plantilla dinámica, sustituir el parámetro por una fixture local conocida y registrarla en la tabla de resultados. Ejemplos: `/play/[id]` usa una mesa de prueba; `/replays/[gameId]` y `/replays/mesa/[roomId]` usan replays sintéticos; las rutas admin con `[id]`, `[userId]` y `[roomId]` usan datos sin PII.

### 3. Auditoría de producción: solo superficie pública

```bash
npx unlighthouse --site https://primerariveradalos4ases.com
```

Este comando es apropiado para las páginas indexables y las pantallas que no exigen sesión. Si el login, Turnstile, un `robots.txt` o un redireccionamiento impide navegar a una URL, registrar el bloqueo como tal; no intentar eludir controles antiabuso ni automatizar OTP/MFA.

### 4. Auditoría local: rutas públicas y controladas

En una terminal, arrancar el entorno que ya tiene las variables locales configuradas:

```bash
./dev.sh
```

En otra terminal, cuando `http://127.0.0.1:3000` responda:

```bash
npx unlighthouse --site http://127.0.0.1:3000
```

La comparación producción/local sirve para separar regresiones del código de factores externos (CDN, red, servicios de terceros o caché). No comparar puntuaciones aisladas como si fueran equivalentes: registrar el entorno y repetir las páginas críticas tres veces, usando la mediana para cada métrica.

### 5. Rutas autenticadas: estado de Playwright, no credenciales

`storageState` contiene cookies y almacenamiento de sesión; debe tratarse como un secreto. Se genera manualmente, en local y con una cuenta de prueba, nunca mediante valores escritos en un test o en un comando.

```bash
# Abre Chromium. El auditor completa manualmente el login local y cierra la ventana.
# El estado resultante queda en una ruta ya ignorada por Git.
  --save-storage=.playwright/player-audit.json \
  http://127.0.0.1:3000/login/player

# Repetir, tras completar manualmente login + MFA local, para el rol admin de prueba.
  --save-storage=.playwright/admin-audit.json \
  http://127.0.0.1:3000/login/admin
```

Validar primero que cada estado llega a una ruta protegida y no al login. El `playwright.config.ts` del repositorio usa `PLAYWRIGHT_BASE_URL` (por defecto `http://127.0.0.1:3000`), por lo que la verificación puede ejecutarse contra el mismo origen local.

Unlighthouse realiza rastreo global y no recibe un archivo `storageState` de Playwright como entrada. Por ello, **no se debe afirmar cobertura autenticada solo porque Unlighthouse haya terminado**. Para esas rutas, usar el mismo estado con Lighthouse controlado por Playwright y conservar el restablecimiento de almacenamiento desactivado:

```ts
// .playwright/auth-lighthouse.mts (archivo local, no versionado)
import { readFileSync } from 'node:fs'
import lighthouse from 'lighthouse'
import { chromium } from 'playwright'

const port = 9222
const url = 'http://127.0.0.1:3000/dashboard'
const storageState = JSON.parse(
  readFileSync('.playwright/player-audit.json', 'utf8'),
)

const browser = await chromium.launch({
  args: [`--remote-debugging-port=${port}`],
})
const context = await browser.newContext({ storageState })
const page = await context.newPage()
await page.goto(url, { waitUntil: 'networkidle' })

if (page.url().includes('/login')) {
  throw new Error('La sesión de auditoría no alcanzó la ruta protegida.')
}

const result = await lighthouse(url, {
  port,
  disableStorageReset: true,
  output: ['html', 'json'],
  logLevel: 'error',
})

await browser.close()
console.log(result?.lhr.categories)
```

El script requiere que `lighthouse` esté disponible como dependencia local de auditoría. Instalarlo explícitamente antes de ejecutarlo, revisar el cambio de `package.json`/lockfile y no añadir el estado de sesión al repositorio:

```bash
pnpm add -Dw lighthouse
pnpm exec tsx .playwright/auth-lighthouse.mts
```

Cambiar `url` y el archivo de estado para cada ruta privada. Ejecutar en un único worker y con un puerto de depuración único para evitar colisiones. Caducar y regenerar los estados al terminar la auditoría.

## Criterios de cobertura total

La auditoría se declara **completa** solo si se cumplen simultáneamente estos criterios:

1. Cada ruta estática de `ROUTES.md` tiene una fila con URL, tipo de acceso, entorno, fecha, método, estado HTTP/redirección y enlace al artefacto HTML/JSON.
2. Cada plantilla dinámica tiene al menos una instancia de fixture por rol aplicable, documentada sin identificadores reales.
3. Las rutas públicas se ejecutaron con Unlighthouse contra producción y local; cualquier diferencia relevante se explica o queda como hallazgo.
4. Cada ruta protegida se verificó con el `storageState` del rol correcto y se auditó con Lighthouse/Playwright con `disableStorageReset: true`; un resultado que redirige al login cuenta como **bloqueada**, no como auditada.
5. Se guardaron tres corridas por página crítica y se registró la mediana; se etiquetan las métricas como laboratorio, no como datos de campo.
6. No hay credenciales, cookies, JWT, headers `Authorization`, teléfonos, emails ni fixtures con PII en el informe, artefactos versionados o logs compartidos.

## Cobertura por área

La tabla conserva el inventario completo del producto. La línea base de producción cubrió exclusivamente las URLs descubiertas por sitemap y rastreo público.

| Área | Rutas | Método requerido | Resultado actual |
|---|---|---|---|
| Públicas y legales | `/`, `/privacy`, `/terms`, `/rules`, `/security-policy`, `/primera-riverada-los-4-ases` | Unlighthouse: producción y local | Producción: auditadas todas excepto `/primera-riverada-los-4-ases`, no descubierta. Local: pendiente (servidor no activo). |
| Auth jugador | `/login/player`, `/login/player/verify`, `/login/player/device-verify`, `/register/player`, `/register/player/verify`, `/register/player/pin`, `/register/player/biometric`, `/register/player/complete`, `/recovery`, `/recovery/verify`, `/recovery/pin` | Unlighthouse solo para la pantalla sin sesión; no completar OTP/PIN reales | Producción: auditadas `/login/player`, `/register/player` y `/recovery`. Resto y local: pendientes. |
| Auth admin | `/login/admin`, `/login/admin/recovery`, `/login/admin/password`, `/login/admin/mfa`, `/login/admin/mfa/setup`, `/register/admin` | Unlighthouse solo para la pantalla sin sesión; MFA manual únicamente para crear estado local | Pendiente: ninguna ruta descubierta por el sitemap. |
| Jugador | `/dashboard`, `/lobby`, `/wallet`, `/wallet/deposit`, `/wallet/withdraw`, `/wallet/history`, `/profile`, `/stats`, `/friends`, `/leaderboard`, `/replays` | Lighthouse + Playwright con `player-audit.json` | Pendiente: no ejecutado |
| Jugador dinámicas | `/play/[id]`, `/replays/[gameId]`, `/replays/mesa/[roomId]` | Lighthouse + Playwright con fixture local y `player-audit.json` | Pendiente: no ejecutado |
| Admin | `/admin`, `/admin/users`, `/admin/ledger`, `/admin/tables`, `/admin/deposits`, `/admin/withdrawals`, `/admin/ganancias`, `/admin/consultas`, `/admin/disputes`, `/admin/disputes/new`, `/admin/audit`, `/admin/security`, `/admin/broadcast`, `/admin/broadcast/history`, `/admin/support`, `/admin/alerts`, `/admin/server-log`, `/admin/rules`, `/admin/replays` | Lighthouse + Playwright con `admin-audit.json` de solo lectura | Pendiente: no ejecutado |
| Admin dinámicas | `/admin/ledger/[userId]`, `/admin/disputes/[id]`, `/admin/replays/[gameId]`, `/admin/spectate/[roomId]` | Lighthouse + Playwright con fixture local y `admin-audit.json`; no supervisar una sala real | Pendiente: no ejecutado |

## Limitaciones observables

- La línea base tiene una sola muestra por ruta; no se debe usar para presupuestos ni comparaciones concluyentes. Repetir tres corridas y registrar la mediana.
- El sitemap no representa todas las rutas del App Router ni instancias de segmentos dinámicos.
- Unlighthouse cubre el rastreo de la superficie pública; la sesión de Playwright no se debe asumir compatible con su crawler. Las páginas privadas requieren la auditoría dirigida de Lighthouse/Playwright descrita arriba.
- El entorno local no estaba disponible en `http://127.0.0.1:3000` durante la ejecución, por lo que no se evaluaron rutas locales ni autenticadas.
- Los resultados locales no sustituyen los de producción y los resultados de Lighthouse son de laboratorio. La evaluación de Core Web Vitals de usuarios reales requiere datos de campo separados.
- Flujos que generen movimientos financieros, cambios de permisos, envíos, sanciones, partidas o efectos de moderación están excluidos.

## Recomendaciones priorizadas

1. **P0 — Corregir contraste y landmark `main`.** Resolver los hallazgos de accesibilidad de la portada y páginas legales, verificando después con Lighthouse y prueba manual de teclado/lector de pantalla.
2. **P0 — Confirmar el `noindex` de recuperación.** Documentar que es intencional o quitarlo si la ruta debe indexarse.
3. **P1 — Crear fixtures y roles de auditoría no mutables.** Sin ellas no es posible declarar cobertura privada completa de forma segura.
4. **P1 — Ejecutar la matriz local y autenticada.** Arrancar `./dev.sh`, generar estados efímeros y ejecutar Lighthouse/Playwright por rol y fixture.
5. **P2 — Investigar bfcache, JavaScript no usado y solicitudes bloqueantes.** Usar los artefactos generados para no optimizar a ciegas; priorizar login, registro y portada.
6. **P2 — Automatizar la matriz de URLs.** Mantener un inventario derivado de `ROUTES.md` y del App Router, con una fixture explícita para cada segmento dinámico.

## Referencias

- [Mapa de rutas del producto](../../product/ROUTES.md)
- [Guía de testing](../../testing/TESTING.md)
- [Sitemap del App Router](../../../apps/web/src/app/sitemap.ts)
- [Unlighthouse CLI](https://unlighthouse.dev/integrations/cli)
- [Autenticación con Playwright y Lighthouse](https://unlighthouse.dev/learn-lighthouse/playwright/authentication)
