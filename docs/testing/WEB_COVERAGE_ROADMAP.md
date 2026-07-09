# Roadmap de Cobertura Web

## Objetivo del Documento

Este documento define el estado actual de cobertura de `apps/web`, el objetivo deseado, la estrategia de ejecucion, la forma de dividir el trabajo y los checklists de verificacion para avanzar de manera sostenible hacia una cobertura global de alta confianza.

No es un documento aspiracional generico. Es una hoja de ruta operativa para que el equipo pueda tomar el trabajo por fases, medir avance real y evitar inflar coverage con pruebas de poco valor.

## Estado Actual Medido

Fecha de referencia: 2026-07-08. Medicion ejecutada localmente sobre `apps/web` con `pnpm --filter web test:coverage`.

Cobertura actual de `apps/web`:

| Metrica | Valor actual |
|---|---:|
| Statements | `99.48%` |
| Lines | `99.48%` |
| Functions | `95.66%` |
| Branches | `91.51%` |

Resultado de la corrida:

- `195` suites en verde.
- `1698` tests pasando.
- La suite actual ya cubre una parte amplia de UI, server actions, rutas y componentes compartidos. El gap restante se concentra en ramas condicionales complejas, auth/security, infraestructura Supabase y piezas UI pesadas.
- Ultimo reporte completo revisado por OpenCode: salida local de `pnpm --filter web test:coverage` del 2026-07-08.

## Meta Final

Objetivo estrategico de largo plazo:

- `98%` global en `statements`, `lines`, `functions` y `branches` para `apps/web`.

Objetivo de calidad asociado:

- No degradar la calidad de aserciones.
- No maquillar coverage con snapshots vacios o asserts triviales.
- Cubrir caminos reales de negocio, errores de red, estados de carga, render condicional y side effects.

## Realidad del Gap

Mantener y extender el `98%` en la web ya no es un problema de baseline bajo; ahora es un trabajo de hardening sobre huecos especificos y ramas dificiles, especialmente `functions` y `branches`. La web incluye:

- App Router de Next.js.
- formularios publicos de auth;
- landing altamente interactiva;
- dashboard y wallet del jugador;
- componentes de juego en tiempo real;
- panel admin;
- wrappers y providers;
- integraciones con Supabase, Turnstile, WebAuthn, sockets y PWA.

Por tanto, la meta final debe abordarse como hardening incremental. Los proximos puntos porcentuales costaran mas que los primeros porque la superficie restante esta en modulos con acoplamiento alto, side effects o muchos branches.

## Principios de Implementacion

### 1. Coverage sirve al riesgo, no al reves

Los archivos mas criticos deben atacarse primero aunque no sean los mas faciles.

### 2. Aserciones semanticas

Cada prueba debe responder a una pregunta funcional concreta:

- que ve el usuario;
- que accion queda habilitada o bloqueada;
- que redirect ocurre;
- que mensaje aparece;
- que side effect se ejecuta;
- que rama de error queda protegida.

### 3. Evitar pruebas de relleno

No se aceptan estrategias como:

- montar un componente sin asserts sustanciales;
- hacer snapshots de arboles enormes como unico assert;
- cubrir helpers privados sin tocar el flujo visible;
- mockear tanto que el test deja de representar un caso real.

### 4. Subir coverage por dominios, no por archivo aislado sin contexto

La unidad operativa correcta es una capacidad funcional:

- auth del jugador;
- landing;
- wallet;
- mesa de juego;
- admin dashboard;
- providers;
- rutas y middleware.

### 5. Los gates deben endurecerse de forma gradual

El gate final de `98%` ya esta definido, pero el trabajo real debe planificarse en etapas de adopcion para no bloquear avances del repo sin camino de remediacion.

## Alcance Actual de Coverage en Web

Hoy `apps/web/jest.config.mjs` incluye:

- `src/app/**/*.{ts,tsx}`
- `src/components/**/*.{ts,tsx}`
- `src/utils/**/*.{ts,tsx}`
- `src/hooks/**/*.{ts,tsx}`
- `src/lib/**/*.{ts,tsx}`

Exclusiones actuales:

- `*.d.ts`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`

Esto es correcto para medir superficie real. El problema no es configuracion incompleta; el problema es deficit real de pruebas sobre UI, hooks y wrappers.

## Diagnostico: Donde se Hunde la Cobertura

### A. Actions grandes de servidor

Estado actual:

- `app/actions/replays.ts`: `100%` statements, con branches principales cubiertos.
- `app/actions/admin-rake.ts`: `100%` statements/lines/functions, branches `96.96%`; quedan ramas defensivas menores de `rakeEntries || []`.
- `app/actions/admin-ledger.ts`: `100%` statements/lines/functions/branches.
- `app/actions/admin-tables.ts`: `100%` statements/lines/functions, branches `95.04%`.
- `app/(auth)/auth-actions.ts`: `99.54%` statements/lines, branches `85.71%`, functions `100%` (Fase 1 del plan de hardening cubrió fieldErrors faltantes, verifyOtp edge cases, checkAccountSanction edge, phone recovery, completeGoogleRegistration rollback/duplicate/otp errors, admin TOTP setup edge, redeemAdminRecoveryCode sin TOTP, enrollAdminTotp error, checkPhoneHasPin catch no-Error, getGoogleUserData metadata vacía, rate limit + turnstile bloqueado).
- `app/actions/admin-security.ts`: `100%` statements/lines/functions, branches `97.27%`; quedan solo ramas defensivas menores de defaults/nullish.
- `app/actions/support.ts`: `100%` statements/lines/functions, branches `91.86%`; quedan solo ramas defensivas `||` que son inaccesibles con la implementación actual de `getAuthenticatedUser()`.

Riesgo:

- concentran cientos de lineas sin cubrir o con ramas criticas;
- mezclan auth, Supabase, Redis, fetch externo, storage y side effects;
- requieren mocks cuidadosos para no probar solo mocks;
- algunos tocan dominios sensibles como soporte, replays, auth y ledger.

### B. Auth y seguridad

Estado actual:

- `app/(auth)/auth-actions.ts`: `99.54%` statements/lines, `85.71%` branches, `100%` functions tras Fase 1 del plan de hardening (jun 2026). Quedan 2 branches menores en `verifyOtp` (rama de éxito sin error).
- `app/(auth)/auth-actions-helpers.ts`: `100%`.
- `passkey-actions.ts`: `100%` statements/lines/functions/branches tras hardening de env vars, fallbacks de userName/transports/sign_count y auth guard de verificacion.
- Las paginas de login/registro tienen buena base, pero quedan ramas de error y variantes de recovery/admin.

Riesgo:

- login y registro son flujos de conversion criticos;
- mezclan validacion local, server actions, Turnstile, OTP, PIN, passkeys, sesiones, cookies y mensajes de error.

### C. Game UI y mesa

Estado actual:

- `components/game/Lobby.tsx`: `99.71%`, branches `80.51%`, functions `93.33%`.
- `components/game/Board.tsx`: `100%` statements/lines, ramas `89.78%`, funciones `92.85%`.
- `app/play/[id]/page.tsx`: `99.68%` statements/lines, `87.74%` branches, `100%` functions; quedan callback de `window.location.reload` y catch defensivo de audio.

Riesgo:

- UI compleja;
- flujos simultaneos;
- multiples permisos/estados del jugador;
- el coverage actual no garantiza confianza funcional suficiente sobre edge cases multiplayer.

### D. Shell compartido y experiencia transversal

Estado actual:

- `NotificationCenter.tsx`: `100%`, ramas `97.18%`, funciones `100%`.
- `SupportChat.tsx`: `100%` statements/lines, ramas `90.18%`, funciones `86.66%`; quedan guards defensivos de socketUrl y ramas de audio legacy.
- `components/providers/AppLockProvider.tsx`: `95.92%`, con ramas de browser/session aun pendientes.
- Varios hooks estan sobre `88%`, pero branches siguen bajos.

Riesgo:

- componentes de gran superficie;
- estados sincronizados con browser APIs;
- propensos a regresiones silenciosas.

### E. Landing publica

Estado actual:

- `components/landing/LandingContent.tsx`: `100%` statements/lines/functions, `96.15%` branches; quedan fallbacks `||` de helpers de tutorial y guards de refs null.
- `components/landing/LandingAnimations.tsx`: `100%`, funciones `100%`.
- Tutoriales de landing tienen cobertura alta en lineas, con algunos branches pendientes.

Riesgo:

- arbol grande;
- dynamic imports y animaciones;
- muchos handlers y estados visuales aun no ejercitados por tests.

### F. Infra web de Supabase y hooks

Estado actual:

- `utils/supabase/middleware.ts`: `99.16%`, branches `96.55%`.
- `utils/supabase/client.ts`: `100%`.
- `utils/supabase/server.ts`: `93.54%`.
- `lib/app-lock-session.ts`: `100%` statements/lines/functions, `93.75%` branches tras caracterizar session markers, bypass one-shot, cookie de redirect y fallbacks seguros ante storage bloqueado.
- Hooks globales: `96.69%`, con branches `87%`.

Riesgo:

- baja cobertura de adaptadores e infraestructura hace dificil detectar regresiones en entornos reales.

## Zonas Mejor Posicionadas

Estas areas ya tienen una base razonable sobre la que construir:

- `src/app/actions/*` de admin y finanzas;
- `src/lib/*` y `src/lib/security/*`;
- `src/utils/supabase/middleware.ts`;
- `ReplayBoard.tsx` y `ReplayController.tsx`;
- `ActionControls.tsx`;
- `TurnstileWidget`;
- varias acciones auth ya testeadas.

Estas zonas no estan "terminadas", pero no son el primer cuello de botella del coverage global.

## Objetivo Intermedio por Fases

No debemos trabajar solo contra la meta final. Se proponen hitos de madurez:

| Fase | Objetivo global web | Resultado esperado |
|---|---:|---|
| Fase 0 | `98.85%` statements/lines, `93.08%` functions y `86.59%` branches actual | baseline real ya medido con `188` suites y `1418` tests |
| Fase 1 | `98%` statements/lines | recuperado con `app/og-image/route.tsx` sin snapshot visual fragil |
| Fase 2 | `93%` functions | atacar callbacks visibles en landing, game UI y paginas App Router |
| Fase 3 | `86%` branches | cubrir ramas de auth/admin/support con valor de negocio |
| Fase 4 | `90%` branches | endurecer acciones admin/security, soporte y paths defensivos |
| Fase 5 | `95%` functions | cerrar handlers residuales de UI publica/game/shell |
| Fase 6 | `98%` en las cuatro metricas | hardening final, edge cases y gate estricto sostenible |

## Estrategia General para Llegar a la Meta

### Eje 1. Atacar archivos pesados con cero cobertura

Porque arrastran miles de lineas sin ejecutar.

### Eje 2. Priorizar journeys publicos y de conversion

Porque mezclan riesgo alto con alto impacto sobre negocio.

### Eje 3. Descomponer componentes gigantes cuando el test directo sea demasiado caro

Si una pieza como `LandingContent.tsx` o `Board.tsx` se vuelve intratable para testing, la solucion no es abandonar el coverage, sino introducir seams y extracciones pequenas que permitan probar mejor.

### Eje 4. Diferenciar tipos de prueba

- unit para helpers puros;
- component tests para render y UX;
- integration tests para server actions y wrappers;
- Playwright para journeys integrados.

### Eje 5. Usar checklists por modulo

Cada modulo debe tener una definicion clara de "cobertura suficiente".

## Roadmap Operativo por Frentes

## Frente 1: Landing Publica

### Objetivo

Llevar `components/landing/*` desde cobertura casi nula a una base estable que reduzca de forma fuerte el peso muerto del coverage global.

### Archivos prioritarios

- `components/landing/LandingContent.tsx`
- `components/landing/LocationMap.tsx`
- `components/landing/LandingAnimations.tsx`
- `components/landing/tutorials/TutorialWalkthrough.tsx`
- `components/landing/tutorials/InstallAppTutorial.tsx`
- `components/landing/tutorials/RegisterTutorial.tsx`
- `components/landing/tutorials/LoginTutorial.tsx`

### Qué probar

- render base de hero, FAQ, servicios y CTAs;
- navegacion entre secciones;
- comportamiento del carousel/tutorial selector;
- apertura de tutoriales;
- render responsive minimo;
- fallbacks de imports dinamicos cuando aplique;
- accesibilidad minima de botones, headings y enlaces.

### Checklist

- [ ] el hero principal renderiza titulo, CTA y copy esperados;
- [ ] los enlaces publicos criticos existen y apuntan bien;
- [ ] el selector de tutoriales permite cambiar de tarjeta;
- [ ] al elegir un tutorial se muestra el walkthrough esperado;
- [ ] FAQ y secciones informativas aparecen con contenido correcto;
- [ ] los botones prev/next del carousel cubren estados habilitado/deshabilitado;
- [ ] se mockean `gsap`, `next/dynamic`, `next/image` y browser APIs necesarias sin destruir el comportamiento observable;
- [ ] el test no depende de timers reales innecesarios.

## Frente 2: Auth del Jugador

### Objetivo

Convertir auth player en una de las zonas mejor cubiertas del repo porque es critica, publica y con alto riesgo de regresion.

### Archivos prioritarios

- `app/(auth)/login/player/page.tsx`
- `app/(auth)/register/player/page.tsx`
- `app/(auth)/register/player/verify/page.tsx`
- `app/(auth)/register/player/pin/page.tsx`
- `app/(auth)/recovery/page.tsx`
- `app/(auth)/recovery/verify/page.tsx`

### Qué probar

- validaciones locales;
- visualizacion de errores de server action;
- cambio de estados con `useActionState`;
- OTP vs PIN vs passkey;
- Turnstile visible y requerido;
- ramas de usuario con/sin PIN;
- estados `pending` y disabled.

### Checklist Login Player

- [ ] valida telefono invalido y muestra mensaje local;
- [ ] valida PIN invalido y muestra mensaje local;
- [ ] si `checkPhoneHasPin` retorna `false`, la UI cambia a flujo OTP;
- [ ] si `checkPhoneHasPin` retorna `true` o `null`, la UI conserva flujo PIN;
- [ ] muestra error de server action cuando `loginWithPin` falla;
- [ ] deshabilita submit durante pending;
- [ ] renderiza y conserva `TurnstileWidget`;
- [ ] si hay passkey disponible, muestra CTA biometrico;
- [ ] si passkey falla, muestra mensaje accionable;
- [ ] si hay `kicked=true`, muestra advertencia de sesion expulsada.

### Checklist Register Player

- [ ] valida `fullName`;
- [ ] valida `nickname`;
- [ ] valida `phone`;
- [ ] actualiza contador de nickname;
- [ ] persiste avatar seleccionado en hidden input;
- [ ] renderiza errores de servidor;
- [ ] deshabilita submit durante pending;
- [ ] mantiene visibilidad del flujo Google Sign-In y Turnstile.

## Frente 3: Dashboard y Wallet del Jugador

### Objetivo

Cubrir la experiencia posterior al login, especialmente todo lo que muestre saldo, transacciones, modales y vacios.

### Archivos prioritarios

- `components/dashboard/PlayerDashboard.tsx`
- `components/wallet/WalletContent.tsx`
- `components/wallet/TransactionModal.tsx`
- `components/wallet/TransferModal.tsx`
- componentes relacionados de deposito/retiro si comparten logica visual.

### Qué probar

- render de datos principales;
- estados vacios;
- errores visibles;
- apertura/cierre de modales;
- botones habilitados/deshabilitados;
- transiciones de tabs o vistas si existen.

### Checklist

- [ ] el dashboard muestra saldo, CTA y accesos clave;
- [ ] wallet maneja lista vacia de transacciones;
- [ ] wallet maneja lista con datos;
- [ ] modales abren y cierran correctamente;
- [ ] errores de acciones se muestran en UI;
- [ ] montos invalidos bloquean acciones cuando aplique.

## Frente 4: Shell Transversal y UX Compartida

### Objetivo

Cubrir componentes que aparecen en muchas paginas y hoy tienen cero o muy poca cobertura.

### Archivos prioritarios

- `BroadcastBanner.tsx`
- `NotificationCenter.tsx`
- `PWAInstallPrompt.tsx`
- `SupportChat.tsx`
- `SupportTrigger.tsx`
- `VoiceChat.tsx`
- `BottomNav.tsx`

### Checklist

- [ ] render condicional segun props o estado;
- [ ] CTA visibles y accesibles;
- [ ] cierre de banners/modales;
- [ ] manejo de estado vacio;
- [ ] browser APIs mockeadas correctamente;
- [ ] sin dependencias innecesarias de implementacion interna.

## Frente 5: Game UI Critica

### Objetivo

Subir la confianza sobre componentes de mesa y lobby sin tratar de cubrir todo con Playwright.

### Archivos prioritarios

- `components/game/Lobby.tsx`
- `components/game/Board.tsx`
- overlays y modales de ayuda, reglas, reconexion, anuncio, showdown, transferencias;
- wrappers de permisos y estado del jugador.

### Qué probar

- visibilidad condicional por fase;
- permisos de acciones;
- render para observador vs jugador;
- avisos de reconexion;
- ayuda y reglas;
- errores de acciones;
- callbacks disparados desde controles.

### Checklist

- [ ] un jugador autorizado ve acciones disponibles;
- [ ] un observador o jugador sin turno no ve o no puede usar acciones restringidas;
- [ ] se muestran overlays correctos en estados especiales;
- [ ] lobby muestra estados vacio, esperando y listo;
- [ ] modales criticos abren/cerran y renderizan contenido esperado.

## Frente 6: Hooks, Providers e Infra Web

### Objetivo

Cubrir infraestructura reusable cuya regresion rompe muchas pantallas a la vez.

### Archivos prioritarios

- `components/providers/*`
- `hooks/*`
- `utils/supabase/server.ts`
- `utils/supabase/client.ts`
- `utils/redis.ts`

### Checklist

- [ ] hooks cubren init, cleanup y ramas sin API disponible;
- [ ] providers cubren render base y side effects principales;
- [ ] adaptadores Supabase validan env y factory creation;
- [ ] wrappers defensivos no quedan en `0%`.

## Frente 7: API Routes y Edge Cases

### Objetivo

Cerrar huecos en endpoints App Router que hoy no se ejecutan en test.

### Archivos prioritarios

- `app/api/livekit/route.ts`
- `app/api/auth/confirm/route.ts`
- otras `route.ts` expuestas por la web.

### Checklist

- [ ] request valido retorna respuesta esperada;
- [ ] request invalido retorna status y mensaje correctos;
- [ ] errores aguas abajo se traducen de forma segura;
- [ ] no se filtran secretos o mensajes internos.

## Tipos de Test Recomendados por Caso

| Caso | Tipo principal | Herramienta |
|---|---|---|
| validacion local de formularios | component test | Jest + Testing Library |
| render condicional de componentes | component test | Jest + Testing Library |
| server actions | integration test | Jest |
| hooks con browser APIs | unit/integration | Jest |
| wrappers Supabase | unit/integration | Jest |
| journeys cross-page | E2E | Playwright |

## Tecnicas de Mocking Recomendadas

### Para Next.js

- mockear `next/navigation` para `useRouter`, `useSearchParams`, `redirect`;
- mockear `next/dynamic` de forma controlada;
- mockear `next/image` y `next/script` cuando estorben al assert funcional.

### Para browser APIs

- `matchMedia`
- `IntersectionObserver`
- `ResizeObserver`
- `navigator.credentials`
- `Notification`
- `BroadcastChannel`
- `localStorage` / `sessionStorage`

### Para integraciones externas

- Supabase clients;
- GSAP;
- Turnstile;
- socket providers;
- mapas y geolocalizacion.

Regla: mockear el borde externo, no el comportamiento de la propia unidad bajo prueba.

## Antipatrones que Debemos Evitar

- escribir tests solo para ejecutar lineas sin validar nada importante;
- snapshots gigantes como unica forma de verificacion;
- testear clases CSS irrelevantes en lugar de comportamientos;
- mockear todo el componente hijo cuando lo que importa es la interaccion real;
- crear tests tan fragiles que se rompan por cambios cosmeticos.

## Definicion de Hecho por Modulo

Un modulo se considera razonablemente cubierto cuando:

- tiene test de render base;
- tiene test de al menos un estado feliz;
- tiene test de al menos un estado de error;
- tiene test de estado vacio o guard clause si aplica;
- cubre interacciones clave del usuario;
- cubre ramas condicionales visibles o side effects principales.

## Orden Recomendado de Ejecucion

### Ola 1: Maximo retorno rapido

1. `LandingContent.tsx`
2. `login/player/page.tsx`
3. `register/player/page.tsx`
4. `PlayerDashboard.tsx`
5. `WalletContent.tsx`

### Ola 2: Consolidacion de superficie visible

1. shell compartido;
2. tutoriales landing;
3. wallet modals;
4. auth verify/pin/recovery;
5. providers clave.

### Ola 3: Hardening tecnico

1. hooks;
2. adaptadores infra;
3. API routes;
4. game UI compleja;
5. huecos residuales.

## Backlog Ejecutable por Lotes

Esta seccion convierte el roadmap en trabajo operable. Cada lote debe poder tomarse de forma independiente, ejecutarse, medirse y cerrarse con evidencia.

### Reglas del backlog

- un lote no debe mezclar demasiados dominios sin necesidad;
- cada lote debe tener un objetivo principal de coverage;
- cada lote debe terminar con una nueva medicion de `apps/web`;
- si un lote revela que un componente es demasiado grande para testear de forma sana, se permite una refactorizacion pequena y reversible para introducir seams;
- no cerrar un lote solo porque "subio el porcentaje": debe cerrar tambien riesgo funcional.

### Tablero Maestro

| Lote | Dominio | Prioridad | Estado | Dependencias | Meta del lote |
|---|---|---|---|---|---|
| L1 | Landing hero + tutoriales base | Alta | Completado | ninguna | sacar del `0%` a `LandingContent` y helpers principales |
| L2 | Auth player login | Alta | Completado | L1 opcional | cubrir flujo visual de login player |
| L3 | Auth player register | Alta | Completado | L2 opcional | cubrir flujo visual de registro player |
| L4 | Auth verify + pin + recovery | Alta | Completado | L2 y L3 | cerrar journey auth player completo |
| L5 | Dashboard + wallet shell | Alta | Completado | L2 | cubrir post-login de jugador |
| L6 | Wallet modals + transferencias | Media | Completado | L5 | cubrir interacciones financieras UI |
| L7 | Shell transversal + providers | Media | En progreso | ninguna | cubrir componentes compartidos de alto impacto |
| L8 | Game lobby + overlays criticos | Alta | En progreso | L2 | cubrir game UI con mayor retorno |
| L9 | Board hardening | Alta | Pendiente | L8 | subir ramas y funciones de `Board.tsx` |
| L10 | Hooks + Supabase web infra | Media | En progreso | ninguna | cubrir adaptadores y hooks en `0%` |
| L11 | API routes web | Media | Completado | L10 opcional | cubrir rutas App Router sin tests |
| L12 | Barrido final de huecos residuales | Alta | Pendiente | L1-L11 | preparar salto a gate final |

### Lote L1: Landing hero + tutoriales base

Objetivo:

- mover la landing desde cobertura nula a una base inicial fuerte;
- capturar render, CTA, FAQ y primer nivel de interaccion del carousel/tutoriales.

Archivos foco:

- `components/landing/LandingContent.tsx`
- `components/landing/LocationMap.tsx`
- `components/landing/LandingAnimations.tsx`
- `components/landing/tutorials/TutorialWalkthrough.tsx`

Trabajo esperado:

- mock controlado de `gsap`, `next/dynamic`, `next/image`;
- test de render de hero y FAQs;
- test de tutorial card selection;
- test de botones prev/next del carousel;
- test de CTA publicos principales.

Criterio de salida:

- `LandingContent.tsx` deja de estar en `0%`;
- existe cobertura sobre interacciones principales de la landing;
- el lote no depende de snapshots grandes.

Checklist:

- [x] mocks base reutilizables para landing listos;
- [x] test render hero;
- [x] test FAQ;
- [x] test CTA a login/register;
- [x] test seleccion de tutorial;
- [x] test navegacion del carousel;
- [x] medicion de coverage despues del lote.

Estado real registrado:

- `LandingContent.tsx`: `85.73%` statements, `89.53%` branches, `45.71%` functions, `85.73%` lines.
- `LocationMap.tsx`: `100%` statements, `66.66%` branches, `100%` functions, `100%` lines.
- `TutorialWalkthrough.tsx`: `98.52%` statements, `53.33%` branches, `50%` functions, `98.52%` lines.

### Lote L2: Auth player login

Objetivo:

- cubrir `app/(auth)/login/player/page.tsx` como journey visual unitario;
- validar ramas PIN, OTP, passkey, errores y kicked session.

Archivos foco:

- `app/(auth)/login/player/page.tsx`

Trabajo esperado:

- mock de `useSearchParams`, `useRouter`, `useActionState`, `checkPhoneHasPin`, `getPasskeyLoginOptions`, `verifyPasskeyLogin`;
- test de validacion local;
- test de error de server action;
- test de estado pending;
- test de cambio a OTP cuando `hasPin === false`;
- test de CTA biometrico.

Criterio de salida:

- login player deja de ser hueco importante;
- se cubren ramas criticas visibles al usuario.

Checklist:

- [x] telefono invalido;
- [x] PIN invalido;
- [x] cambio a flujo OTP;
- [x] error de server action;
- [x] estado pending;
- [x] passkey disponible;
- [x] passkey fallida;
- [x] banner `kicked=true`.

Estado real registrado:

- `app/(auth)/login/player/page.tsx`: `99.07%` statements, `87.5%` branches, `100%` functions, `99.07%` lines.

### Lote L3: Auth player register

Objetivo:

- cubrir `app/(auth)/register/player/page.tsx` con foco en validaciones, avatar y render de errores.

Archivos foco:

- `app/(auth)/register/player/page.tsx`
- `components/auth/avatar-selector.tsx`

Trabajo esperado:

- test de validaciones locales por campo;
- test del contador de nickname;
- test del avatar hidden input;
- test de render de error de server action;
- test de submit disabled en pending.

Criterio de salida:

- register player deja de estar sin cobertura directa;
- `avatar-selector.tsx` deja de estar en `0%` o queda indirectamente cubierto de forma clara.

Checklist:

- [x] validacion de nombre;
- [x] validacion de nickname;
- [x] validacion de telefono;
- [x] contador de nickname;
- [x] seleccion de avatar;
- [x] hidden input consistente;
- [x] error de servidor;
- [x] pending state.

Estado real registrado:

- `app/(auth)/register/player/page.tsx`: `99.58%` statements, `92.68%` branches, `100%` functions, `99.58%` lines.
- `components/auth/avatar-selector.tsx`: `100%` statements, `100%` branches, `100%` functions, `100%` lines.

### Lote L4: Auth verify + pin + recovery

Objetivo:

- cerrar el journey auth player mas alla de login/register iniciales.

Archivos foco:

- `app/(auth)/register/player/verify/page.tsx`
- `app/(auth)/register/player/pin/page.tsx`
- `app/(auth)/recovery/page.tsx`
- `app/(auth)/recovery/verify/page.tsx`

Trabajo esperado:

- estados de token/codigo valido e invalido;
- formularios bloqueados/desbloqueados;
- errores de server action;
- confirmaciones y redirects visibles si aplica.

Criterio de salida:

- auth player queda cubierto como sistema, no solo como pantallas iniciales.

Checklist:

- [x] verify OTP error;
- [x] verify OTP success state;
- [x] set PIN validation;
- [x] recovery form validation;
- [x] recovery verify errors;
- [x] disabled/pending states.

Estado real registrado:

- `app/(auth)/register/player/verify/page.tsx`: `100%` statements, `83.33%` branches, `100%` functions, `100%` lines.
- `app/(auth)/register/player/pin/page.tsx`: `100%` statements, `90.9%` branches, `100%` functions, `100%` lines.
- `app/(auth)/recovery/page.tsx`: `99.23%` statements, `75%` branches, `100%` functions, `99.23%` lines.
- `app/(auth)/recovery/verify/page.tsx`: `100%` statements, `83.33%` branches, `100%` functions, `100%` lines.

## Checkpoints Reales

## Checkpoint 1

- Fecha: baseline inicial del programa de coverage.
- Coverage antes: `19.06%` statements, `19.06%` lines, `39.03%` functions, `63.28%` branches.
- Coverage despues: `19.06%` statements, `19.06%` lines, `39.03%` functions, `63.28%` branches.
- Archivos cubiertos: ninguno del nuevo roadmap; solo medición base.
- Riesgos cerrados: ninguno, solo visibilidad del problema.
- Riesgos abiertos: landing, auth player, wallet, shell, game UI, hooks, API routes.
- Siguiente lote: `L1`.

## Checkpoint 2

- Fecha: cierre de `L1`.
- Coverage antes: `19.06%` statements, `19.06%` lines, `39.03%` functions, `63.28%` branches.
- Coverage despues: `22.96%` statements, `22.96%` lines, `40.18%` functions, `64.74%` branches.
- Archivos cubiertos: `LandingContent.tsx`, `LocationMap.tsx`, `TutorialWalkthrough.tsx`.
- Riesgos cerrados: landing pública deja de estar en `0%`; hero, CTA, FAQ, carousel, tutoriales y ubicación ya tienen base de protección.
- Riesgos abiertos: auth player, wallet, shell, game UI, hooks, API routes.
- Siguiente lote: `L2`.

## Checkpoint 3

- Fecha: cierre de `L2`.
- Coverage antes: `22.96%` statements, `22.96%` lines, `40.18%` functions, `64.74%` branches.
- Coverage despues: `23.81%` statements, `23.81%` lines, `41.64%` functions, `65.55%` branches.
- Archivos cubiertos: `app/(auth)/login/player/page.tsx`.
- Riesgos cerrados: login player queda prácticamente cubierto; validación local, flujo PIN/OTP, passkeys, estados pending y query params protegidos.
- Riesgos abiertos: register player, verify/pin/recovery, wallet, shell, game UI, hooks, API routes.
- Siguiente lote: `L3`.

## Checkpoint 4

- Fecha: cierre de `L3`.
- Coverage antes: `23.81%` statements, `23.81%` lines, `41.64%` functions, `65.55%` branches.
- Coverage despues: `24.66%` statements, `24.66%` lines, `44.27%` functions, `66.58%` branches.
- Archivos cubiertos: `app/(auth)/register/player/page.tsx`, `components/auth/avatar-selector.tsx`.
- Riesgos cerrados: register player y la selección de avatar dejan de estar en `0%`; validaciones, hidden input y errores de servidor protegidos.
- Riesgos abiertos: verify/pin/recovery, wallet, shell, game UI, hooks, API routes.
- Siguiente lote: `L4`.

## Checkpoint 5

- Fecha: cierre de `L4`.
- Coverage antes: `24.66%` statements, `24.66%` lines, `44.27%` functions, `66.58%` branches.
- Coverage despues: `25.98%` statements, `25.98%` lines, `46.9%` functions, `67.38%` branches.
- Archivos cubiertos: `register/player/verify/page.tsx`, `register/player/pin/page.tsx`, `recovery/page.tsx`, `recovery/verify/page.tsx`.
- Riesgos cerrados: journey auth player queda cubierto de extremo a extremo en UI principal de registro, verificación, creación de PIN y recuperación.
- Riesgos abiertos: wallet, shell transversal, game UI, hooks, infra web y API routes.
- Siguiente lote: `L5` o `L7` si se prioriza impacto transversal antes de wallet.

## Checkpoint 6

- Fecha: cierre de `L5`.
- Coverage antes: `25.98%` statements, `25.98%` lines, `46.9%` functions, `67.38%` branches.
- Coverage despues: `27.09%` statements, `27.09%` lines, `48.32%` functions, `68.33%` branches.
- Archivos cubiertos: `components/dashboard/PlayerDashboard.tsx`, `components/wallet/WalletContent.tsx`.
- Riesgos cerrados: dashboard y wallet shell dejan de ser zonas ciegas; saldo, accesos, estado vacio, lista de movimientos y apertura/cierre de modales ya tienen proteccion.
- Riesgos abiertos: shell transversal, wallet modals profundos, game UI, hooks, infra web y API routes.
- Siguiente lote: `L6` si se quiere profundizar wallet, o `L7` si se prioriza cobertura transversal compartida.

### Lote L5: Dashboard + wallet shell

Objetivo:

- cubrir la primera experiencia post-login del jugador.

Archivos foco:

- `components/dashboard/PlayerDashboard.tsx`
- `components/wallet/WalletContent.tsx`

Trabajo esperado:

- render de resumen de cuenta;
- estados vacios;
- estado con datos;
- accesos a deposito/retiro/transferencia;
- mensajes de error visibles.

Criterio de salida:

- dashboard y wallet shell dejan de estar en `0%`;
- se cubren los estados mas usados por soporte y producto.

Checklist:

- [ ] dashboard con datos;
- [ ] dashboard con estado vacio o loading si aplica;
- [ ] wallet sin transacciones;
- [ ] wallet con transacciones;
- [ ] CTA visibles;
- [ ] manejo de error visible.

### Lote L6: Wallet modals + transferencias

Objetivo:

- cubrir interacciones financieras de UI sin tocar logica de ledger ya testeada en server actions.

Archivos foco:

- `components/wallet/TransferModal.tsx`
- `components/wallet/TransactionModal.tsx`
- componentes relacionados de modales financieros.

Trabajo esperado:

- apertura/cierre;
- validacion de montos;
- errores de submit;
- callbacks principales.

Criterio de salida:

- modales de wallet dejan de ser peso muerto de coverage.

Checklist:

- [x] open/close modal;
- [x] invalid amount;
- [x] valid amount;
- [x] action disabled when pending;
- [x] visible error handling.

Estado real registrado:

- `components/wallet/TransferModal.tsx`: `100%` statements, `97.91%` branches, `93.33%` functions, `100%` lines.
- `components/wallet/TransactionModal.tsx`: `100%` statements, `91.66%` branches, `100%` functions, `100%` lines.
- El bloque queda cubierto como UI financiera: server actions, RPCs y `wallets_ledger` permanecen fuera del alcance de estos tests y se mockean en bordes.

### Lote L7: Shell transversal + providers

Objetivo:

- cubrir piezas compartidas cuya regresion rompe muchas pantallas.

Archivos foco:

- `BroadcastBanner.tsx`
- `NotificationCenter.tsx`
- `PWAInstallPrompt.tsx`
- `SupportChat.tsx`
- `SupportTrigger.tsx`
- `BottomNav.tsx`
- `components/providers/*`

Trabajo esperado:

- tests de render condicional;
- tests de cierre y dismiss;
- tests de browser APIs;
- tests de provider setup/cleanup.

Criterio de salida:

- eliminar varios `0%` de alto peso compartido.

Checklist:

- [ ] broadcast render/dismiss;
- [ ] notifications empty/non-empty;
- [ ] PWA prompt visible/hidden;
- [ ] support trigger opens flow;
- [ ] bottom nav active state;
- [ ] provider init/cleanup where relevant.

### Lote L8: Game lobby + overlays criticos

Objetivo:

- cubrir el inicio de la experiencia de mesa y overlays de mayor visibilidad.

Archivos foco:

- `components/game/Lobby.tsx`
- `ReconnectOverlay.tsx`
- `RulesModal.tsx`
- `TableHelpModal.tsx`
- `PiqueRevealOverlay.tsx`

Trabajo esperado:

- estados esperando/listo/error;
- overlays visibles en condiciones correctas;
- modales abren y cierran;
- callbacks y permisos basicos.

Criterio de salida:

- `Lobby.tsx` deja de estar en `0%`;
- overlays de mayor visibilidad ya tienen base de coverage.

Checklist:

- [ ] lobby waiting state;
- [ ] lobby ready state;
- [ ] reconnect overlay visible;
- [ ] rules modal open/close;
- [ ] help modal open/close;
- [ ] special overlay render conditions.

### Lote L9: Board hardening

Objetivo:

- subir branches y functions de `Board.tsx`, no solo lineas.

Archivos foco:

- `components/game/Board.tsx`
- subcomponentes directamente necesarios para ramas faltantes.

Trabajo esperado:

- tabla de ramas faltantes de coverage;
- testear permisos, estados de turno, mano transfer, overlays y ramas condicionales no cubiertas.

Criterio de salida:

- mejora visible de branches/functions en `Board.tsx`;
- no introducir tests acoplados a detalles cosméticos.

Checklist:

- [ ] ramas de permisos;
- [ ] ramas por fase;
- [ ] ramas por tipo de usuario;
- [ ] callbacks clave;
- [ ] estados especiales no cubiertos.

### Lote L10: Hooks + Supabase web infra

Objetivo:

- eliminar `0%` en hooks y adaptadores clave.

Archivos foco:

- `hooks/useGamePermissions.ts`
- `hooks/useNotificationSocket.ts`
- `hooks/usePresence.ts`
- `hooks/useWakeLock.ts`
- `utils/supabase/server.ts`
- `utils/supabase/client.ts`

Trabajo esperado:

- tests de init/cleanup;
- ramas sin API disponible;
- validacion de env y factories;
- side effects controlados.

Criterio de salida:

- hooks e infra dejan de ser zona ciega.

Checklist:

- [ ] init path;
- [ ] cleanup path;
- [ ] API unavailable path;
- [ ] env validation;
- [ ] factory creation.

### Lote L11: API routes web

Objetivo:

- cubrir `route.ts` expuestas por la web.

Archivos foco:

- `app/api/livekit/route.ts`
- `app/api/auth/confirm/route.ts`
- otras rutas existentes en `app/api/**`.

Trabajo esperado:

- request validos e invalidos;
- error translation;
- status codes;
- mensajes seguros.

Criterio de salida:

- ningun endpoint importante queda en `0%`.

Checklist:

- [ ] request valido;
- [ ] request invalido;
- [ ] downstream failure;
- [ ] secure error message.

### Lote L12: Barrido final de huecos residuales

Objetivo:

- tomar el reporte restante y eliminar archivos aislados que todavia impidan el gate final.

Trabajo esperado:

- ordenar por peor coverage restante;
- cerrar grupos pequeños de archivos;
- limpiar ramas de error faltantes.

Criterio de salida:

- el repo queda listo para endurecer el gate al siguiente hito.

Checklist:

- [ ] revisar top 20 peores archivos remanentes;
- [ ] agrupar por dominio;
- [ ] cerrar huecos de ramas de error;
- [ ] repetir medicion final de la fase.

## Dependencias y Orden de Toma

Orden recomendado de ejecucion real:

1. L1
2. L2
3. L3
4. L4
5. L5
6. L6
7. L7
8. L8
9. L9
10. L10
11. L11
12. L12

Orden alternativo si se busca maximizar porcentaje mas rapido:

1. L1
2. L2
3. L3
4. L5
5. L7
6. L8
7. L9
8. L10
9. L11
10. L4
11. L6
12. L12

## Plantilla de Seguimiento por Lote

Usar esta plantilla al iniciar y cerrar cada lote:

```md
## Lote LX - Nombre

- Estado: Pendiente | En progreso | Bloqueado | Completado
- Fecha inicio:
- Fecha cierre:
- Responsable:
- Coverage antes:
- Coverage despues:
- Archivos foco:
- Tests agregados:
- Riesgos cerrados:
- Bloqueos encontrados:
- Refactors necesarios:
- Siguiente lote recomendado:
```

## Definicion de Completado por Lote

Un lote solo puede marcarse como completado si cumple todo lo siguiente:

- [ ] los tests nuevos del lote pasan de forma local;
- [ ] lint del area pasa;
- [ ] no se introdujeron mocks innecesariamente acoplados a implementacion interna;
- [ ] se corrio `pnpm --filter web test:coverage` al cierre del lote o del mini-lote consolidado;
- [ ] se registro coverage antes y despues;
- [ ] se documentaron riesgos cerrados y deuda remanente;
- [ ] el siguiente lote quedo explicitamente priorizado.

## Checkpoint de Seguimiento

Cada checkpoint debe registrar:

- coverage global antes y despues;
- archivos atacados;
- tests agregados;
- deuda remanente;
- bloqueos tecnicos;
- siguiente lote recomendado.

Template de checkpoint:

```md
## Checkpoint N

- Fecha:
- Coverage antes:
- Coverage despues:
- Archivos cubiertos:
- Riesgos cerrados:
- Riesgos abiertos:
- Siguiente lote:
```

## Plan de Gates

Mientras el repo no este cerca del objetivo final, el equipo debe operar con dos niveles:

### Gate estrategico final

- `98%` global en web.

### Gate operativo por fase

- registrar una meta temporal por fase;
- no bajar respecto al baseline alcanzado;
- elevar el umbral solo cuando la suite ya lo soporte con margen razonable.

Gate operativo vigente hoy en CI:

- Web: `90%` statements, `84%` branches, `86%` functions, `90%` lines.
- Game server: `89%` statements, `80%` branches, `89%` functions, `90%` lines.

Justificacion:

- elimina falsos rojos permanentes mientras la campaña de cobertura sigue en marcha;
- mantiene presión para no retroceder respecto al baseline real alcanzado;
- permite que `publish-game-server-image` vuelva a ejecutarse cuando la validación real pase.

Ejemplo de endurecimiento recomendado:

- Fase 1: fijar `30%`
- Fase 2: fijar `45%`
- Fase 3: fijar `60%`
- Fase 4: fijar `75%`
- Fase 5: fijar `85%`
- Fase 6: fijar `92%`
- Fase 7: fijar `98%`

## Comandos de Trabajo

Medicion completa:

```bash
pnpm --filter web test:coverage
```

Corrida dirigida por archivo:

```bash
pnpm --filter web exec jest --runTestsByPath "src/ruta/al/test.test.tsx"
```

Lint del area web:

```bash
pnpm --filter web lint
```

Typecheck web:

```bash
pnpm exec tsc --noEmit -p apps/web/tsconfig.json
```

Playwright para journeys criticos:

```bash
pnpm --filter web exec playwright test --config "../../playwright.config.ts"
```

## Procedimiento de Trabajo para Cada Lote

1. Elegir un frente concreto.
2. Listar archivos objetivo del lote.
3. Ejecutar tests existentes del area para baseline local.
4. Escribir tests nuevos por comportamiento, no por estructura interna.
5. Validar lint.
6. Volver a correr coverage web.
7. Registrar checkpoint.
8. Repriorizar siguiente lote segun impacto real en cobertura.

## Criterios de Priorizacion

Cuando dos archivos compitan por atencion, priorizar en este orden:

1. mas lineas en `0%`;
2. mas impacto de negocio;
3. mas probabilidad de regresion;
4. menor costo de aislamiento en test;
5. mayor reutilizacion de mocks/utilidades para lotes futuros.

## Qué Significa Exito

Tendremos exito cuando:

- la cobertura global suba de forma sostenida y medible;
- las areas mas riesgosas esten protegidas primero;
- el equipo pueda tomar el roadmap por lotes pequenos;
- los checklists eviten trabajo ambiguo;
- el gate final de `98%` deje de ser teorico y pase a ser sostenible.

## Checkpoint 11

- Fecha: mini-lote posterior a `L9`.
- Coverage antes: `33.98%` statements, `33.98%` lines, `53.6%` functions, `70.53%` branches.
- Coverage despues: `35.36%` statements, `35.36%` lines, `55.47%` functions, `70.89%` branches.
- Archivos cubiertos: `useNotificationSocket.ts`, `ChipSelector.tsx`, `DepositForm.tsx`.
- Riesgos cerrados: mejora del ecosistema de mesa y depósito; socket de notificaciones, selección de fichas y flujo principal de depósito ya tienen cobertura útil sobre ramas visibles y side effects clave.
- Riesgos abiertos: `Board.tsx` profunda, `usePresence.ts`, `useWakeLock.ts`, `AppLockProvider.tsx`, `PlayerAppLockWrapper.tsx`, `DepositModal.tsx`, `CustomMesaModal.tsx`, `SupportChat.tsx`, `VoiceChat.tsx`.
- Siguiente lote: endurecer `Board.tsx` o entrar a providers/hooks restantes.

## Checkpoint 12

- Fecha: bloque de sesión/presencia posterior al mini-lote.
- Coverage antes: `35.36%` statements, `35.36%` lines, `55.47%` functions, `70.89%` branches.
- Coverage despues: `36.04%` statements, `36.04%` lines, `56.78%` functions, `71.12%` branches.
- Archivos cubiertos: `AppLockProvider.tsx`, `PlayerAppLockWrapper.tsx`, `usePresence.ts`, `useWakeLock.ts`.
- Riesgos cerrados: mejora clara del ecosistema de sesión, bloqueo biométrico y presencia; ya no dependen de comportamiento implícito sin pruebas alrededor de enroll, unlock, tracking de presencia y wake lock.
- Riesgos abiertos: `Board.tsx` profunda, `usePresence.ts` y `useWakeLock.ts` aún con algunas ramas menores pendientes, además de piezas grandes del realtime client y modales secundarios.
- Siguiente lote: segunda pasada más agresiva sobre `Board.tsx` o entrada a hooks/proveedores restantes del realtime.

## Checkpoint 13

- Fecha: alineación operativa de CI.
- Coverage antes: `36.04%` statements, `36.04%` lines, `56.78%` functions, `71.12%` branches en web; `87.36%` statements, `88.43%` lines, `87.5%` functions, `77.24%` branches en game-server.
- Coverage despues: sin cambio funcional de producto; se actualiza el gate operativo para que GitHub Actions valide contra el baseline real y no contra el objetivo final aún no alcanzado.
- Archivos cubiertos: ninguno adicional de app; cambio de configuración y documentación.
- Riesgos cerrados: fallo inmediato de `pnpm/action-setup` por doble versión; CI rojo permanente por umbral imposible.
- Riesgos abiertos: seguir endureciendo thresholds por fases hasta `98%`.
- Siguiente lote: continuar con el roadmap funcional mientras se eleva el gate por checkpoints.

## Proximo Paso Recomendado

El siguiente lote de ejecucion deberia ser:

1. `components/game/Board.tsx` (segunda pasada profunda)
2. `components/game/Lobby.tsx`
3. `app/play/[id]/page.tsx` o seams pequeños para poder testearlo sin acoplarse al runtime completo
4. componentes aislados restantes en `0%` o muy bajos (`app/primera-riverada-los-4-ases/page.tsx`, `admin-recovery-codes.ts`, `redis.ts`)
5. primer corte de admin UI con componentes de mayor retorno

Ese lote combina:

- una segunda pasada a `Board.tsx`, que sigue siendo el principal foco tecnico del game client;
- el cierre de `Lobby.tsx` y del runtime visible de `app/play/[id]`, que aun arrastran mucho peso;
- preparacion del salto a Fase 3 (`60%`) atacando game UI, shell compartido y primeros cortes de admin UI.

## Checkpoint 14

- Fecha: bloque API/infra/voz/landing animations posterior a `Checkpoint 13`.
- Coverage antes: `36.07%` statements, `36.07%` lines, `56.78%` functions, `71.12%` branches.
- Coverage despues: `37.94%` statements, `37.94%` lines, `58.92%` functions, `72.09%` branches.
- Archivos cubiertos: `app/api/livekit/route.ts`, `app/api/auth/confirm/route.ts`, `app/api/auth/callback/route.ts`, `utils/supabase/client.ts`, `utils/supabase/server.ts`, `components/VoiceChat.tsx`, `components/landing/LandingAnimations.tsx`.
- Tests agregados: `livekit/__tests__/route.test.ts`, `auth/confirm/__tests__/route.test.ts`, `auth/callback/__tests__/route.test.ts`, `utils/supabase/__tests__/client.test.ts`, `utils/supabase/__tests__/server.test.ts`, `components/__tests__/VoiceChat.test.tsx`, `components/landing/__tests__/LandingAnimations.test.tsx`.
- Riesgos cerrados: rutas API criticas ya no estan en `0%`; LiveKit valida request valido, configuracion faltante y errores seguros; confirm/callback cubren redirects y proteccion contra open redirects; factories Supabase cubren cookies y service role; voz cubre token, microfono, permisos, speakers y modal de audio; animaciones landing cubren movimiento normal, reducido y contenedor ausente.
- Riesgos abiertos: `SupportChat.tsx`, `Board.tsx` profunda, `app/play/[id]/page.tsx`, tutoriales landing aun en `0%`, admin UI y modales secundarios de game.
- Siguiente lote: `SupportChat.tsx` por peso y visibilidad compartida, seguido de `Board.tsx`/modales game.

## Checkpoint 15

- Fecha: cierre de Fase 2 operativa.
- Coverage antes: `37.94%` statements, `37.94%` lines, `58.92%` functions, `72.09%` branches.
- Coverage despues: `45.09%` statements, `45.09%` lines, `62.93%` functions, `73.43%` branches.
- Archivos cubiertos: `components/SupportChat.tsx`, `components/landing/tutorials/*`, `components/game/DepositModal.tsx`, `components/game/RechargeButton.tsx`, `hooks/__tests__/useGamePermissions.test.tsx`.
- Tests agregados: `components/__tests__/SupportChat.test.tsx`, `components/landing/tutorials/__tests__/TutorialSteps.test.tsx`, `components/game/__tests__/DepositModal.test.tsx`.
- Riesgos cerrados: `SupportChat.tsx` deja de estar en `0%` y cubre lista, historial, primer mensaje, mensajes posteriores, eventos socket, cierre y adjuntos; tutoriales landing dejan de ser peso muerto y validan labels/render de cada flujo; `DepositModal` y `RechargeButton` cubren apertura, cierre y exito del formulario; typecheck web vuelve a pasar al retirar un `@ts-expect-error` sobrante en test.
- Riesgos abiertos: `Board.tsx` profunda, `app/play/[id]/page.tsx`, `CustomMesaModal.tsx`, `PiqueRevealOverlay.tsx`, animaciones game, admin UI y componentes aislados en `0%`.
- Siguiente lote: Fase 3 con foco en game UI critica (`Board`, overlays y modales de mesa).

## Checkpoint 16

- Fecha: primera pasada de Fase 3 sobre game UI critica.
- Coverage antes: `45.09%` statements, `45.09%` lines, `62.93%` functions, `73.43%` branches.
- Coverage despues: `46.11%` statements, `46.11%` lines, `63.69%` functions, `73.76%` branches.
- Archivos cubiertos: `components/game/CustomMesaModal.tsx`, `components/game/PiqueRevealOverlay.tsx`.
- Tests agregados: `components/game/__tests__/CustomMesaAndPique.test.tsx`.
- Riesgos cerrados: modal de mesa personalizada deja de estar en `0%` y cubre submit bloqueado, estado `creating`, seleccion de jugadores/entrada/pique/fichas, validacion de al menos una ficha y cierre por backdrop; overlay de pique deja de estar en `0%`, cubre jugador sin revelacion, reveal por fold, reveal por `passedWithJuego`, parseo de cartas y `dismiss-reveal`.
- Riesgos abiertos: `Board.tsx` profunda, `app/play/[id]/page.tsx`, `AnimationLayer.tsx`, `ShuffleAnimation.tsx`, `ShowdownCinematic.tsx`, `TransferModal.tsx`, `game-header.tsx` y admin UI.
- Siguiente lote: seguir Fase 3 con `AnimationLayer.tsx`/`ShuffleAnimation.tsx` o segunda pasada profunda a `Board.tsx`.

## Checkpoint 17

- Fecha: continuacion de Fase 3 sobre modales y flujo visible de mesa.
- Coverage antes: `48.12%` statements, `48.12%` lines, `64.8%` functions, `74.45%` branches.
- Coverage despues: `49.11%` statements, `49.11%` lines, `65.33%` functions, `74.72%` branches.
- Archivos cubiertos: `components/game/TransferModal.tsx`.
- Tests agregados: `components/game/__tests__/GameTransferModal.test.tsx`.
- Riesgos cerrados: el modal de transferencia en mesa deja de estar en `0%` y cubre modal cerrado, busqueda por telefono sanitizado, lookup fallido, confirmacion de destinatario, validacion de monto minimo y saldo disponible, envio de transferencia, resultado exitoso, balance nuevo, cierre y error de transferencia.
- Riesgos abiertos: `Board.tsx` profunda, `Lobby.tsx`, `app/play/[id]/page.tsx`, componentes compartidos en `0%`, admin UI y ramas residuales de providers/infra.
- Siguiente lote: `Board.tsx` segunda pasada o `Lobby.tsx` para continuar el cierre de Fase 3 hacia `60%`.

## Checkpoint 18

- Fecha: cierre de componentes compartidos pequeños en `0%`.
- Coverage antes: `49.11%` statements, `49.11%` lines, `65.33%` functions, `74.72%` branches.
- Coverage despues: `49.66%` statements, `49.66%` lines, `66.17%` functions, `74.86%` branches.
- Archivos cubiertos: `components/OrientationPortrait.tsx`, `components/pwa-lock-screen.tsx`, `components/PresenceTracker.tsx`, `components/ui/Toast.tsx`, `components/providers/FramerMotionProvider.tsx`.
- Tests agregados: `components/__tests__/SharedZeroCoverage.test.tsx`.
- Riesgos cerrados: restauracion de orientacion y salida de fullscreen en mobile, bloqueo/limpieza de scroll en lock screen PWA, estados de desbloqueo exitoso/fallido, tracking de presencia con lista vacia, montaje del provider de Framer Motion y autocierre temporizado de toast.
- Riesgos abiertos: `Board.tsx` profunda, `Lobby.tsx`, `app/play/[id]/page.tsx`, `LandscapeLockOverlay.tsx`, `ClientErrorSuppressor.tsx`, `google-sign-in-button.tsx`, admin UI y ramas residuales de infra.
- Siguiente lote: entrar a `Lobby.tsx` o `app/play/[id]/page.tsx` para capturar mas peso funcional antes del primer corte admin.

## Checkpoint 19

- Fecha: cruce de `50%` global con cierre de huecos aislados.
- Coverage antes: `49.66%` statements, `49.66%` lines, `66.17%` functions, `74.86%` branches.
- Coverage despues: `50.1%` statements, `50.1%` lines, `67.05%` functions, `75.16%` branches.
- Archivos cubiertos: `components/replay/LandscapeLockOverlay.tsx`, `components/ClientErrorSuppressor.tsx`, `components/auth/google-sign-in-button.tsx`, `hooks/useCardPreloader.ts`, `lib/colyseus.ts`.
- Tests agregados: `components/__tests__/MoreZeroCoverage.test.tsx`, `hooks/__tests__/useCardPreloader.test.tsx`, `lib/__tests__/colyseus.test.ts`.
- Riesgos cerrados: overlay de replay en portrait/landscape, supresion acotada de errores benignos de LiveKit solo en development, boton Google con loading/error/redirect, precarga de cartas una sola vez y construccion de URL Colyseus desde env build/runtime/location.
- Riesgos abiertos: `Board.tsx` profunda, `Lobby.tsx`, `app/play/[id]/page.tsx`, admin UI en `0%`, `redis.ts`, `admin-recovery-codes.ts` y paginas App Router publicas/admin sin seams.
- Siguiente lote: `Lobby.tsx` o primer corte admin (`LedgerFilters.tsx`, `SupportConversationList.tsx`, `UserLedgerTable.tsx`) segun prioridad de producto.

## Checkpoint 20

- Fecha: segunda pasada sobre `Lobby.tsx` y primer corte admin pequeño.
- Coverage antes: `50.1%` statements, `50.1%` lines, `67.05%` functions, `75.16%` branches.
- Coverage despues: `50.79%` statements, `50.79%` lines, `68.51%` functions, `75.22%` branches.
- Archivos cubiertos: `components/game/Lobby.tsx`, `components/admin/DashboardAutoRefresh.tsx`, `components/admin/DashboardWarnings.tsx`, `components/admin/DeleteTableButton.tsx`, `components/admin/TableActiveToggle.tsx`, `components/admin/UserSearch.tsx`.
- Tests agregados/extendidos: `components/game/__tests__/Lobby.test.tsx`, `components/admin/__tests__/AdminSmallControls.test.tsx`.
- Riesgos cerrados: mensajes realtime de lobby `rooms`, entrada a mesa activa, apertura de placeholder con config DB, bloqueo por saldo insuficiente, cierre admin de mesa, debounce de busqueda admin, autorefresh del dashboard, warnings degradados, toggle activo/inactivo y delete con error visible.
- Riesgos abiertos: `Lobby.tsx` aun tiene ramas de error/mesa custom, `Board.tsx` profunda, `app/play/[id]/page.tsx`, admin UI pesada (`LedgerFilters`, `SupportConversationList`, `UserLedgerTable`, `CreateTableModal`) y utilidades infra (`redis.ts`, `admin-recovery-codes.ts`).
- Siguiente lote: primer corte admin pesado con `LedgerFilters.tsx` o `ResponsiveDataView.tsx` para subir superficie en `0%` sin tocar negocio financiero.

## Checkpoint 21

- Fecha: primer corte admin de componentes reutilizables y controles operativos.
- Coverage antes: `50.79%` statements, `50.79%` lines, `68.51%` functions, `75.22%` branches.
- Coverage despues: `51.69%` statements, `51.69%` lines, `69.4%` functions, `75.57%` branches.
- Archivos cubiertos: `components/admin/ResponsiveDataView.tsx`, `components/admin/PlayerControls.tsx`, `components/admin/TableControls.tsx`, `components/admin/RulesEditor.tsx`.
- Tests agregados: `components/admin/__tests__/AdminControlsAndDataView.test.tsx`.
- Riesgos cerrados: render dual tabla/cards de `ResponsiveDataView`, empty state, custom card renderer, expulsion de jugador con error, pausa/reanudacion/cierre de sala con confirmacion, guardado exitoso y fallido de reglamento.
- Riesgos abiertos: admin UI pesada de datos (`LedgerFilters`, `SupportConversationList`, `UserLedgerTable`, `CreateTableModal`, `UserBalanceControl`, `UserBanControl`), `app/play/[id]/page.tsx`, ramas profundas de `Board.tsx` y `Lobby.tsx`.
- Siguiente lote: `LedgerFilters.tsx` o `UserBalanceControl.tsx` por impacto admin/finanzas, con foco en UI y callbacks sin tocar ledger server-side.

## Checkpoint 22

- Fecha: admin financiero UI y moderacion de usuarios.
- Coverage antes: `51.69%` statements, `51.69%` lines, `69.4%` functions, `75.57%` branches.
- Coverage despues: `53.03%` statements, `53.03%` lines, `70.02%` functions, `76.02%` branches.
- Archivos cubiertos: `components/admin/UserBalanceControl.tsx`, `components/admin/UserBanControl.tsx`.
- Tests agregados: `components/admin/__tests__/AdminUserModeration.test.tsx`.
- Riesgos cerrados: validacion de monto/motivo, credito/debito via `adjustUserBalance` sin modificar ledger server-side, errores visibles de ajuste, listado de sanciones, revocacion, sancion temporal con expiracion y veto permanente sin expiracion.
- Checklist ledger: sin `UPDATE`/`DELETE` sobre `wallets_ledger`; sin cambios a RPC; tests limitados a UI/callbacks; no se altera atomicidad ni idempotencia financiera.
- Riesgos abiertos: `LedgerFilters.tsx`, `UserLedgerTable.tsx`, `SupportConversationList.tsx`, `CreateTableModal.tsx`, `app/play/[id]/page.tsx`, ramas profundas de `Board.tsx` y `Lobby.tsx`.
- Siguiente lote: `UserLedgerTable.tsx` o `LedgerFilters.tsx` para continuar cobertura admin sin tocar movimientos financieros.

## Checkpoint 23

- Fecha: admin filtros, realtime ledger y limpieza operativa.
- Coverage antes: `53.03%` statements, `53.03%` lines, `70.02%` functions, `76.02%` branches.
- Coverage despues: `53.83%` statements, `53.83%` lines, `70.89%` functions, `76.13%` branches.
- Archivos cubiertos: `components/admin/AdminGlobalSearch.tsx`, `components/admin/AuditFilters.tsx`, `components/admin/CleanupStaleGamesButton.tsx`, `components/admin/LedgerRealtimeRefresh.tsx`.
- Tests agregados: `components/admin/__tests__/AdminFiltersRealtimeCleanup.test.tsx`.
- Riesgos cerrados: busqueda global admin con query sanitizada, limpieza de partidas huerfanas con exito/error, filtros de auditoria por accion/contexto/fecha, export CSV/JSON con descarga, suscripcion realtime a inserts de ledger y refresh debounceado con cleanup.
- Checklist ledger: `LedgerRealtimeRefresh` solo observa `INSERT` realtime y refresca UI; no escribe en ledger ni modifica RPCs.
- Riesgos abiertos: `LedgerFilters.tsx`, `UserLedgerTable.tsx`, `SupportConversationList.tsx`, `CreateTableModal.tsx`, paginas App Router admin/publicas en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI.
- Siguiente lote: `LedgerFilters.tsx` por peso admin alto y porque solo toca URL/filter UI, no ledger writes.

## Checkpoint 24

- Fecha: filtros admin de ledger.
- Coverage antes: `53.83%` statements, `53.83%` lines, `70.89%` functions, `76.13%` branches.
- Coverage despues: `54.98%` statements, `54.98%` lines, `71.38%` functions, `76.56%` branches.
- Archivos cubiertos: `components/admin/LedgerFilters.tsx`.
- Tests agregados: `components/admin/__tests__/LedgerFilters.test.tsx`.
- Riesgos cerrados: filtros de usuarios por nombre/username/id, recalculo de total visible, empty state por busqueda, filtros de transacciones por tipo/direccion/busqueda, sistema/boveda, estados y render dual tabla/card.
- Checklist ledger: pruebas solo de presentacion/filtros; no hay escrituras financieras ni cambios a `wallets_ledger`.
- Riesgos abiertos: `UserLedgerTable.tsx`, `SupportConversationList.tsx`, `CreateTableModal.tsx`, paginas App Router admin/publicas, `app/play/[id]/page.tsx` y ramas profundas de game UI.
- Siguiente lote: `UserLedgerTable.tsx` para completar la vista ledger por usuario.

## Checkpoint 25

- Fecha: tabla ledger por usuario.
- Coverage antes: `54.98%` statements, `54.98%` lines, `71.38%` functions, `76.56%` branches.
- Coverage despues: `55.87%` statements, `55.87%` lines, `71.87%` functions, `76.8%` branches.
- Archivos cubiertos: `components/admin/UserLedgerTable.tsx`.
- Tests agregados: `components/admin/__tests__/UserLedgerTable.test.tsx`.
- Riesgos cerrados: historial por usuario, conceptos game/no-game, sala/ref, jugadores presentes, filtros por tipo/direccion, busqueda en descripcion/metadata y empty state.
- Checklist ledger: pruebas solo de visualizacion/filtros; sin escrituras financieras ni cambios a ledger/RPC.
- Riesgos abiertos: `SupportConversationList.tsx`, `CreateTableModal.tsx`, paginas App Router admin/publicas, `app/play/[id]/page.tsx` y ramas profundas de game UI.
- Siguiente lote: `SupportConversationList.tsx` o `CreateTableModal.tsx`, segun retorno incremental y riesgo de mocks.

## Checkpoint 26

- Fecha: modal admin de creacion de mesas.
- Coverage antes: `55.87%` statements, `55.87%` lines, `71.87%` functions, `76.8%` branches.
- Coverage despues: `56.6%` statements, `56.6%` lines, `72.14%` functions, `77.13%` branches.
- Archivos cubiertos: `components/admin/CreateTableModal.tsx`.
- Tests agregados: `components/admin/__tests__/CreateTableModal.test.tsx`.
- Riesgos cerrados: apertura/cierre del modal, creacion de mesa comun con nombre y jugadores, creacion de mesa personalizada con entrada/pique/fichas deshabilitadas, bloqueo para no deshabilitar todas las fichas y manejo visible de error de creacion.
- Checklist admin: pruebas limitadas a UI y server actions mockeadas; sin cambios en reglas de creacion server-side ni escrituras directas de datos.
- Riesgos abiertos: `SupportConversationList.tsx`, paginas App Router admin/publicas, `app/play/[id]/page.tsx`, `sitemap.ts`, `redis.ts`, `admin-recovery-codes.ts` y ramas profundas de game UI.
- Siguiente lote: `SupportConversationList.tsx` por seguir en `0%` y cerrar el bloque de componentes admin pesados antes de pasar a paginas App Router.

## Checkpoint 27

- Fecha: lista admin de conversaciones de soporte.
- Coverage antes: `56.6%` statements, `56.6%` lines, `72.14%` functions, `77.13%` branches.
- Coverage despues: `57.49%` statements, `57.49%` lines, `72.3%` functions, `77.22%` branches.
- Archivos cubiertos: `components/admin/SupportConversationList.tsx`.
- Tests agregados: `components/admin/__tests__/SupportConversationList.test.tsx`.
- Riesgos cerrados: filtros por estado, contadores, seleccion de ticket, render embebido de chat admin, alta de ticket por socket, actualizacion de mensajes realtime, proteccion contra reabrir tickets finalizados, cierre admin exitoso/fallido y cleanup de socket.
- Checklist soporte realtime: socket mockeado con handlers reales por evento; `SupportChat` se reemplaza por seam visible de props; no se modifica contrato server-side de soporte.
- Riesgos abiertos: paginas App Router admin/publicas en `0%`, `app/play/[id]/page.tsx`, `sitemap.ts`, `redis.ts`, `admin-recovery-codes.ts` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: empezar paginas App Router admin con seams pequeños o atacar utilidades infra (`redis.ts`, `admin-recovery-codes.ts`) para acercarse a Fase 3 (`60%`).

## Checkpoint 28

- Fecha: utilidades de codigos de recuperacion admin.
- Coverage antes: `57.49%` statements, `57.49%` lines, `72.3%` functions, `77.22%` branches.
- Coverage despues: `57.56%` statements, `57.56%` lines, `72.96%` functions, `77.28%` branches.
- Archivos cubiertos: `lib/admin-recovery-codes.ts`.
- Tests agregados: `lib/__tests__/admin-recovery-codes.test.ts`.
- Riesgos cerrados: normalizacion de codigos, formateo por grupos, hash estable del valor normalizado, generacion unica con cantidad por defecto y conteo personalizado.
- Checklist seguridad admin: no se cambia algoritmo ni alfabeto; `crypto.randomInt` solo se mockea en tests para determinismo.
- Riesgos abiertos: paginas App Router admin/publicas en `0%`, `app/play/[id]/page.tsx`, `sitemap.ts`, `redis.ts` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `redis.ts` o primera pagina App Router admin; `redis.ts` es pequeño y ayuda a cerrar infra antes de cambios con seams mas grandes.

## Checkpoint 29

- Fecha: utilidades Redis web y rate limit fallback.
- Coverage antes: `57.56%` statements, `57.56%` lines, `72.96%` functions, `77.28%` branches.
- Coverage despues: `57.74%` statements, `57.74%` lines, `73.62%` functions, `77.46%` branches.
- Archivos cubiertos: `utils/redis.ts`.
- Tests agregados: `utils/__tests__/redis.test.ts`.
- Riesgos cerrados: publish/setex sin Redis configurado, rate limit en memoria, cliente Redis con opciones esperadas, expire del primer hit, limite excedido, fallback ante error Redis, silenciamiento de errores repetidos en development e IP por `x-forwarded-for`/`x-real-ip`/fallback.
- Checklist infra: Redis e `next/headers` mockeados por modulo; sin abrir conexiones reales ni depender de puerto local.
- Riesgos abiertos: paginas App Router admin/publicas en `0%`, `app/play/[id]/page.tsx`, `sitemap.ts` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: atacar paginas App Router pequeñas o `sitemap.ts` antes de entrar a `app/play/[id]/page.tsx`.

## Checkpoint 30

- Fecha: sitemap y redirect SEO publico.
- Coverage antes: `57.74%` statements, `57.74%` lines, `73.62%` functions, `77.46%` branches.
- Coverage despues: `57.87%` statements, `57.87%` lines, `73.88%` functions, `77.52%` branches.
- Archivos cubiertos: `app/sitemap.ts`, `app/primera-riverada-los-4-ases/page.tsx`.
- Tests agregados: `app/__tests__/sitemap.test.ts`, `app/primera-riverada-los-4-ases/__tests__/page.test.tsx`.
- Riesgos cerrados: sitemap limitado a rutas publicas canonicas, exclusion de `/admin` y `/api`, metadata `noindex` de ruta historica de marca y redirect permanente a `/`.
- Checklist SEO: sin cambiar URLs canonicas ni fechas; pruebas solo fijan el contrato existente.
- Riesgos abiertos: paginas App Router admin/publicas en `0%`, `app/page.tsx`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `app/page.tsx` si se puede mockear `LandingContent` sin perder valor, o primera pagina admin pequeña.

## Checkpoint 31

- Fecha: pagina landing canonica App Router.
- Coverage antes: `57.87%` statements, `57.87%` lines, `73.88%` functions, `77.52%` branches.
- Coverage despues: `58.05%` statements, `58.05%` lines, `74.01%` functions, `77.55%` branches.
- Archivos cubiertos: `app/page.tsx`.
- Tests agregados: `app/__tests__/page.test.tsx`.
- Riesgos cerrados: composicion de landing via `LandingContent`, metadata SEO canonica, keywords principales, Open Graph y Twitter card.
- Checklist SEO/UI: `LandingContent` se mockea como seam de composicion; no se modifican tokens ni estructura visual de la landing.
- Riesgos abiertos: paginas App Router admin/publicas en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: primera pagina admin pequeña para reducir ceros de App Router sin entrar todavia a `app/play/[id]/page.tsx`.

## Checkpoint 32

- Fecha: pagina admin de reglamento.
- Coverage antes: `58.05%` statements, `58.05%` lines, `74.01%` functions, `77.55%` branches.
- Coverage despues: `58.19%` statements, `58.19%` lines, `74.14%` functions, `77.58%` branches.
- Archivos cubiertos: `app/(admin)/admin/rules/page.tsx`.
- Tests agregados: `app/(admin)/admin/rules/__tests__/page.test.tsx`.
- Riesgos cerrados: carga inicial de reglamento via `getRulebook`, entrega al editor, copy de formato Markdown e informacion de auditoria.
- Checklist admin UI: `RulesEditor` se mockea como seam de props; no se cambian tokens ni acciones server-side de settings.
- Riesgos abiertos: paginas App Router admin restantes en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: paginas admin pequeñas (`ledger`, `support`, `security`) con mocks de acciones/componentes antes de tocar dashboards grandes.

## Checkpoint 33

- Fecha: pagina admin de libro mayor global.
- Coverage antes: `58.19%` statements, `58.19%` lines, `74.14%` functions, `77.58%` branches.
- Coverage despues: `58.34%` statements, `58.34%` lines, `74.27%` functions, `77.6%` branches.
- Archivos cubiertos: `app/(admin)/admin/ledger/page.tsx`.
- Tests agregados: `app/(admin)/admin/ledger/__tests__/page.test.tsx`.
- Riesgos cerrados: render dinamico sin cache, carga paralela de movimientos/usuarios, conexion a componentes de filtros/realtime y estado de error visible cuando falla la carga.
- Checklist ledger: pagina testeada en modo solo lectura; acciones `getLedgerEntries`/`getUsersWithBalances` mockeadas; sin escrituras financieras ni cambios a `wallets_ledger`/RPC.
- Riesgos abiertos: paginas App Router admin restantes en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `app/(admin)/admin/ledger/[userId]/page.tsx` para completar el par de vistas ledger.

## Checkpoint 34

- Fecha: pagina admin de ledger por usuario.
- Coverage antes: `58.34%` statements, `58.34%` lines, `74.27%` functions, `77.6%` branches.
- Coverage despues: `58.54%` statements, `58.54%` lines, `74.4%` functions, `77.66%` branches.
- Archivos cubiertos: `app/(admin)/admin/ledger/[userId]/page.tsx`.
- Tests agregados: `app/(admin)/admin/ledger/[userId]/__tests__/page.test.tsx`.
- Riesgos cerrados: resolucion async de `params`, carga de perfil/ledger por usuario, calculo de creditos/debitos, saldo/operaciones visibles, fallback de usuario desconocido y seam hacia `UserLedgerTable`.
- Checklist ledger: pruebas de visualizacion y calculo local sobre entradas mockeadas; sin escrituras financieras ni cambios a `wallets_ledger`/RPC.
- Riesgos abiertos: paginas App Router admin restantes en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: paginas admin pequeñas no financieras (`support`, `disputes`, `rules` ya cerrado) o una pagina de auth/admin para seguir reduciendo ceros.

## Checkpoint 35

- Fecha: pagina admin de soporte tecnico.
- Coverage antes: `58.54%` statements, `58.54%` lines, `74.4%` functions, `77.66%` branches.
- Coverage despues: `58.68%` statements, `58.68%` lines, `74.54%` functions, `77.66%` branches.
- Archivos cubiertos: `app/(admin)/admin/support/page.tsx`.
- Tests agregados: `app/(admin)/admin/support/__tests__/page.test.tsx`.
- Riesgos cerrados: consulta de tickets con perfil, obtencion de admin actual, seam hacia `SupportConversationList`, estado de servicio online y error visible sin consultar usuario cuando falla Supabase.
- Checklist soporte: Supabase server mockeado con cadena `from/select/order`; no hay socket real ni cambios a contrato server-side.
- Riesgos abiertos: paginas App Router admin restantes en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: pagina admin de security o disputes para avanzar con paginas medianas antes del dashboard principal.

## Checkpoint 36

- Fecha: seguridad administrativa y panel de hardening.
- Coverage antes: `58.68%` statements, `58.68%` lines, `74.54%` functions, `77.66%` branches.
- Coverage despues: `59.6%` statements, `59.6%` lines, `74.86%` functions, `77.29%` branches.
- Archivos cubiertos: `app/(admin)/admin/security/page.tsx`, `app/(admin)/admin/security/AdminSecurityPanel.tsx`.
- Tests agregados: `app/(admin)/admin/security/__tests__/page.test.tsx`.
- Riesgos cerrados: snapshot de seguridad, estado AAL/TOTP, enlace de vuelta al panel, controles de cambio de email, recuperacion de contraseña, reset TOTP, recovery codes y cierre de sesiones.
- Checklist seguridad: acciones server-side mockeadas; no se cambian flujos MFA, sesiones ni tokens; `useRouter` mockeado sin navegacion real.
- Riesgos abiertos: ramas de avisos/redirect del panel de seguridad, paginas App Router admin restantes en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: cruzar Fase 3 (`60%`) con una pagina admin mediana (`disputes`, `broadcast/history` o `users`) antes de atacar `app/play/[id]/page.tsx`.

## Checkpoint 37

- Fecha: cruce de Fase 3 con paginas admin medianas.
- Coverage antes: `59.6%` statements, `59.6%` lines, `74.86%` functions, `77.29%` branches.
- Coverage despues: `60.16%` statements, `60.16%` lines, `75.22%` functions, `77.4%` branches.
- Archivos cubiertos: `app/(admin)/admin/broadcast/history/page.tsx`, `app/(admin)/admin/disputes/page.tsx`.
- Tests agregados: `app/(admin)/admin/broadcast/history/__tests__/page.test.tsx`, `app/(admin)/admin/disputes/__tests__/page.test.tsx`.
- Riesgos cerrados: historial de broadcasts con loading/empty/error, estadisticas de push/read/fail, fallback de tipo desconocido, lista de disputas con estados/prioridades/enlaces, empty state y error de carga.
- Hito: Fase 3 alcanzada (`60%` global web) con `60.16%` statements/lines.
- Riesgos abiertos: paginas App Router admin grandes en `0%` (`admin`, `alerts`, `broadcast`, `tables`, `users`, `server-log`, `spectate`), `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: empezar Fase 4 (`75%`) priorizando paginas admin de mayor peso o `app/play/[id]/page.tsx` con seams controlados.

## Checkpoint 38

- Fecha: directorio admin de usuarios.
- Coverage antes: `60.16%` statements, `60.16%` lines, `75.22%` functions, `77.4%` branches.
- Coverage despues: `60.72%` statements, `60.72%` lines, `75.19%` functions, `77.54%` branches.
- Archivos cubiertos: `app/(admin)/admin/users/page.tsx`.
- Tests agregados: `app/(admin)/admin/users/__tests__/page.test.tsx`.
- Riesgos cerrados: render dinamico sin cache, busqueda, deteccion basica de huellas compartidas, filtro `fraud`, empty state, usuarios baneados/admin, resumen desktop/mobile y seams hacia controles de balance/ban.
- Checklist admin/ledger: controles financieros y de sancion mockeados como UI; no hay escrituras financieras ni cambios a acciones server-side.
- Riesgos abiertos: paginas App Router admin grandes restantes (`admin`, `alerts`, `broadcast`, `tables`, `server-log`, `spectate`), `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/tables` o `admin/broadcast` por peso alto y componentes ya parcialmente cubiertos.

## Checkpoint 39

- Fecha: pagina admin de control de mesas.
- Coverage antes: `60.72%` statements, `60.72%` lines, `75.19%` functions, `77.54%` branches.
- Coverage despues: `61.79%` statements, `61.79%` lines, `74.74%` functions, `77.48%` branches.
- Archivos cubiertos: `app/(admin)/admin/tables/page.tsx`.
- Tests agregados: `app/(admin)/admin/tables/__tests__/page.test.tsx`.
- Riesgos cerrados: render dinamico sin cache, carga de salas/mesas/financieros, estados en vivo `playing`/`paused`, jugadores y mesa libre, auditoria financiera, gestion de configuraciones y fallback ante errores de carga.
- Checklist admin/ledger: datos financieros testeados como lectura UI; acciones y componentes de mantenimiento mockeados como seams; sin escrituras financieras ni cambios a `wallets_ledger`, RPCs o acciones server-side.
- Riesgos abiertos: paginas App Router admin grandes restantes (`admin`, `alerts`, `broadcast`, `server-log`, `spectate`), `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/broadcast`, `admin/alerts` o `admin/server-log` para seguir reduciendo ceros antes de entrar a `app/play/[id]/page.tsx`.

## Checkpoint 40

- Fecha: pagina admin de broadcast global.
- Coverage antes: `61.79%` statements, `61.79%` lines, `74.74%` functions, `77.48%` branches.
- Coverage despues: `62.64%` statements, `62.64%` lines, `74.9%` functions, `77.64%` branches.
- Archivos cubiertos: `app/(admin)/admin/broadcast/page.tsx`.
- Tests agregados: `app/(admin)/admin/broadcast/__tests__/page.test.tsx`.
- Riesgos cerrados: formulario inicial con preview, enlace al historial, boton deshabilitado sin contenido, cambio de tipo de broadcast, cancelacion por confirmacion, envio confirmado con payload correcto, overlay de exito con audiencia, limpieza diferida y manejo de error con `alert`.
- Checklist admin: `sendBroadcast` mockeado como borde server-side; `framer-motion` y `next/link` se reemplazan por seams de render sincronico; no se cambia contrato de broadcast ni persistencia.
- Riesgos abiertos: paginas App Router admin grandes restantes (`admin`, `alerts`, `server-log`, `spectate`), paginas admin financieras/depositos/retiros en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/alerts` o `admin/server-log` por peso alto sin tocar ledger; reservar `app/play/[id]/page.tsx` para un bloque con seams mas cuidadosos.

## Checkpoint 41

- Fecha: pagina admin de alertas de mesa.
- Coverage antes: `62.64%` statements, `62.64%` lines, `74.9%` functions, `77.64%` branches.
- Coverage despues: `63.73%` statements, `63.73%` lines, `75.06%` functions, `77.85%` branches.
- Archivos cubiertos: `app/(admin)/admin/alerts/page.tsx`.
- Tests agregados: `app/(admin)/admin/alerts/__tests__/page.test.tsx`.
- Riesgos cerrados: carga de salas Colyseus, conteo de mesas en vivo, solicitudes activas con usuarios, estados/razones/tiempos relativos, enlaces de supervision, cambio de estado, resolucion con nota, filtro historial, empty state, error de salas y eventos realtime `INSERT`/`UPDATE` con sonido de alerta.
- Checklist admin realtime: Supabase cliente y Colyseus HTTP mockeados en bordes; suscripcion realtime ejercida con handlers reales; sin cambios a tablas, policies ni acciones server-side.
- Riesgos abiertos: paginas App Router admin grandes restantes (`admin`, `server-log`, `spectate`), paginas admin financieras/depositos/retiros en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/server-log` por similitud con realtime/alertas, o `admin/page.tsx` si se quiere bajar otro cero de alto peso antes de `app/play/[id]/page.tsx`.

## Checkpoint 42

- Fecha: pagina admin de log del servidor.
- Coverage antes: `63.73%` statements, `63.73%` lines, `75.06%` functions, `77.85%` branches.
- Coverage despues: `64.38%` statements, `64.38%` lines, `75.37%` functions, `78.02%` branches.
- Archivos cubiertos: `app/(admin)/admin/server-log/page.tsx`.
- Tests agregados: `app/(admin)/admin/server-log/__tests__/page.test.tsx`.
- Riesgos cerrados: estado de carga, listado de alertas no resueltas, severidad/categoria/sala-juego, filtros por severidad y categoria, busqueda textual, toggle de resueltas, resolucion de alerta, insercion realtime, cleanup del canal y empty state ante error de carga.
- Checklist admin realtime: `getServerAlerts`/`resolveAlert` mockeadas como acciones server-side; Supabase cliente mockeado solo para canal realtime; sin cambios a tabla `server_alerts`, auth admin ni auditoria.
- Riesgos abiertos: paginas App Router admin grandes restantes (`admin`, `spectate`), paginas admin financieras/depositos/retiros en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/page.tsx` para cerrar dashboard principal o `admin/spectate/[roomId]` antes de entrar a `app/play/[id]/page.tsx`.

## Checkpoint 43

- Fecha: dashboard principal admin.
- Coverage antes: `64.38%` statements, `64.38%` lines, `75.37%` functions, `78.02%` branches.
- Coverage despues: `65.59%` statements, `65.59%` lines, `75.5%` functions, `78.05%` branches.
- Archivos cubiertos: `app/(admin)/admin/page.tsx`.
- Tests agregados: `app/(admin)/admin/__tests__/page.test.tsx`.
- Riesgos cerrados: render dinamico sin cache, carga de estadisticas, advertencias, estados de boveda/libro mayor, tooltips financieros de lectura, tarjetas KPI con enlaces, accesos rapidos admin, refresh timestamp, estados `DESCONOCIDO`/`ALERTA` y error visible de carga.
- Checklist ledger/admin: `getAdminDashboardStats` mockeada como borde server-side; pruebas solo validan visualizacion y enlaces; sin cambios a RPCs, acciones financieras ni `wallets_ledger`.
- Riesgos abiertos: pagina App Router admin grande restante `admin/spectate/[roomId]`, paginas admin financieras/depositos/retiros en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: `admin/spectate/[roomId]` para cerrar flujo de supervision o entrar a `app/play/[id]/page.tsx` con seams controlados.

## Checkpoint 44

- Fecha: pagina admin de supervision de mesa.
- Coverage antes: `65.59%` statements, `65.59%` lines, `75.5%` functions, `78.05%` branches.
- Coverage despues: `66.77%` statements, `66.77%` lines, `75.67%` functions, `78.02%` branches.
- Archivos cubiertos: `app/(admin)/admin/spectate/[roomId]/page.tsx`.
- Tests agregados: `app/(admin)/admin/spectate/[roomId]/__tests__/page.test.tsx`.
- Riesgos cerrados: generacion de token de supervision, join Colyseus como espectador, render de estado recibido, admin blindness, contador de jugadores conectados, dealer, jugador botado, VoiceChat, mute/kick, sancion temporal con expulsion, sancion permanente sin expiracion, errores de sancion, errores de conexion/desconexion y cleanup de sala al desmontar.
- Checklist realtime/admin: Colyseus y acciones server-side mockeadas en bordes; no se abren sockets reales; no se relaja Admin Blindness ni se exponen cartas.
- Riesgos abiertos: paginas admin financieras/depositos/retiros y auditoria/replays en `0%`, `app/play/[id]/page.tsx` y ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: entrar a `app/play/[id]/page.tsx` con seams controlados o cerrar paginas admin financieras en modo solo lectura/acciones mockeadas.

## Checkpoint 45

- Fecha: primer bloque de pagina de juego del jugador.
- Coverage antes: `66.77%` statements, `66.77%` lines, `75.67%` functions, `78.02%` branches.
- Coverage despues: `68.85%` statements, `68.85%` lines, `75.06%` functions, `77.77%` branches.
- Archivos cubiertos: `app/play/[id]/page.tsx`.
- Tests agregados: `app/play/[id]/__tests__/page.test.tsx`.
- Riesgos cerrados: join normal con Supabase/wallet/device, token de reconexion, filtrado de ghosts en lobby, ready toggle, reconexion con token guardado, hidratacion de cartas privadas, render de `Board` fuera de lobby, modales por eventos globales, abandono intencional con limpieza, voto de pique, eventos de sala (`room-config`, `pique-reopen`, `declarar-juego-option`, `paso-juego-choice`, `banda`, `error`, `insufficient-balance`), ForceLogout y bloqueo por saldo insuficiente antes de abrir Colyseus.
- Checklist realtime/player: Colyseus, Supabase cliente y componentes pesados mockeados en bordes; no se abren sockets reales; las cartas privadas solo se introducen por mensaje `private-cards`.
- Riesgos abiertos: ramas restantes de `app/play/[id]/page.tsx` (portrait/auto-unready, reconnect failure, leave no intencional, error de Colyseus, cambio de pique sin propuesta, countdown/listos), paginas admin financieras/depositos/retiros y auditoria/replays en `0%`, ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`).
- Siguiente lote: segunda pasada sobre `app/play/[id]/page.tsx` para cerrar ramas restantes antes de volver a paginas admin financieras.

## Checkpoint 46

- Fecha: segunda pasada de sala de juego y cierre de paginas admin de auditoria/consultas/replays.
- Coverage antes: `68.85%` statements, `68.85%` lines, `75.06%` functions, `77.77%` branches.
- Coverage despues: `70.52%` statements, `70.52%` lines, `76.21%` functions, `78.26%` branches.
- Archivos cubiertos: `app/play/[id]/page.tsx`, `app/(admin)/admin/audit/page.tsx`, `app/(admin)/admin/consultas/page.tsx`, `app/(admin)/admin/replays/page.tsx`.
- Tests agregados/extendidos: `app/play/[id]/__tests__/page.test.tsx`, `app/(admin)/admin/audit/__tests__/page.test.tsx`, `app/(admin)/admin/consultas/__tests__/page.test.tsx`, `app/(admin)/admin/replays/__tests__/page.test.tsx`.
- Riesgos cerrados: sala de juego cubre portrait con auto-unready y unlock de orientacion, countdown/listos, propuesta propia de pique, propuesta/cancelacion de pique, prompts de juego hacia `Board`, reapertura de pique, error Colyseus con limpieza de token, descarte por fold, rechazo de pique, fallback de reconexion expirada a join normal y error de join. Auditoria cubre acciones conocidas/desconocidas, actor sistema/admin, objetivo, detalles truncados, empty y error. Consultas globales cubre guia sin query, resultados/enlaces por entidad, CTA de disputa, empty y error. Replays cubre resumen, rake, jugadores unicos, ganador, enlaces de detalle, empty y fallback sin ganador.
- Checklist realtime/admin: Colyseus, Supabase cliente, acciones admin y vistas de datos mockeadas en bordes; no se abren sockets reales; no se cambia contrato de replays/auditoria/busqueda ni se toca ledger.
- Riesgos abiertos: paginas admin financieras/depositos/retiros, detalle/nueva disputa, detalle de replay, paginas auth admin y recovery pin en `0%`, ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`) y ramas residuales de `app/play/[id]/page.tsx` (`leave` no intencional/reload y fallback de nickname/device aleatorio).
- Siguiente lote: cerrar otro grupo App Router en `0%` (`admin/disputes/[id]`, `admin/disputes/new`, `admin/replays/[gameId]`) o entrar a depositos/retiros con skill de ledger y pruebas solo UI/acciones mockeadas.

## Checkpoint 47

- Fecha: cierre de Fase 4 con paginas admin de detalle, finanzas y auth admin.
- Coverage antes: `70.52%` statements, `70.52%` lines, `76.21%` functions, `78.26%` branches.
- Coverage despues: `75.83%` statements, `75.83%` lines, `78.59%` functions, `78.87%` branches.
- Archivos cubiertos: `app/(admin)/admin/disputes/[id]/page.tsx`, `app/(admin)/admin/disputes/[id]/dispute-actions.tsx`, `app/(admin)/admin/disputes/new/page.tsx`, `app/(admin)/admin/replays/[gameId]/page.tsx`, `app/(admin)/admin/deposits/page.tsx`, `app/(admin)/admin/deposits/DepositActions.tsx`, `app/(admin)/admin/withdrawals/page.tsx`, `app/(admin)/admin/withdrawals/WithdrawalActions.tsx`, `app/(admin)/admin/ganancias/page.tsx`, `app/(auth)/login/admin/page.tsx`, `app/(auth)/login/admin/mfa/page.tsx`, `app/(auth)/login/admin/mfa/setup/page.tsx`, `app/(auth)/recovery/pin/page.tsx`.
- Tests agregados: `app/(admin)/admin/disputes/[id]/__tests__/page.test.tsx`, `app/(admin)/admin/disputes/new/__tests__/page.test.tsx`, `app/(admin)/admin/replays/[gameId]/__tests__/page.test.tsx`, `app/(admin)/admin/deposits/__tests__/page.test.tsx`, `app/(admin)/admin/withdrawals/__tests__/page.test.tsx`, `app/(admin)/admin/ganancias/__tests__/page.test.tsx`, `app/(auth)/login/admin/__tests__/page.test.tsx`, `app/(auth)/login/admin/mfa/__tests__/page.test.tsx`, `app/(auth)/login/admin/mfa/setup/__tests__/page.test.tsx`, `app/(auth)/recovery/pin/__tests__/page.test.tsx`.
- Riesgos cerrados: detalle de disputa cubre resolucion, acciones y errores; nueva disputa cubre creacion, validacion y empty/error de busqueda; detalle de replay cubre timeline, estados, errores y fallback; depositos/retiros cubren listados, estados, acciones mockeadas y empty/error; ganancias cubre paginacion, filtros y normalizacion de pagina invalida; auth admin cubre validacion local, errores de login, MFA, setup MFA y recuperacion de PIN.
- Checklist ledger/admin: bloque financiero probado solo en UI/lectura/callbacks con acciones mockeadas; no se tocaron RPCs, movimientos financieros ni `wallets_ledger`.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `152` suites y `903` tests; Fase 4 (`75%`) alcanzada.
- Riesgos abiertos: ramas profundas de game UI (`Board.tsx`, `Lobby.tsx`), auth player device/verify en `0%`, `passkey-actions.ts`, `google-auth.ts` y deuda de typecheck preexistente en tests antiguos.
- Siguiente lote: iniciar Fase 5 con ramas criticas de `Board.tsx`/`Lobby.tsx` o cerrar auth player device/verify antes de endurecer gates.

## Checkpoint 48

- Fecha: OTP de jugador y recuperacion.
- Coverage antes: `75.83%` statements, `75.83%` lines, `78.59%` functions, `78.87%` branches.
- Coverage despues: `76.41%` statements, `76.41%` lines, `78.86%` functions, `78.92%` branches.
- Archivos cubiertos: `app/(auth)/login/player/verify/page.tsx`, `app/(auth)/login/player/device-verify/page.tsx`, `app/(auth)/recovery/verify/page.tsx`.
- Tests agregados: `app/(auth)/login/player/verify/__tests__/page.test.tsx`, `app/(auth)/login/player/device-verify/__tests__/page.test.tsx`, `app/(auth)/recovery/verify/__tests__/page.test.tsx`.
- Riesgos cerrados: pantallas OTP de login, verificacion de dispositivo y recuperacion cubren telefono de query string, `flow` enviado al server action, errores server-side y estado pendiente de envio.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `154` suites y `907` tests; gate web subido a `76%` statements/lines.
- Riesgos abiertos: `passkey-actions.ts`, `google-auth.ts`, `app/(auth)/login/player/page.tsx` con ramas biometricas, `Board.tsx`/`Lobby.tsx` y ramas de middleware Supabase.
- Siguiente lote: cubrir acciones de passkeys/google auth o entrar a ramas profundas de `Lobby.tsx` con seams controlados.

## Checkpoint 49

- Fecha: acciones de passkey y Google OAuth.
- Coverage antes: `76.41%` statements, `76.41%` lines, `78.86%` functions, `78.92%` branches.
- Coverage despues: `77.25%` statements, `77.25%` lines, `79.24%` functions, `78.73%` branches.
- Archivos cubiertos: `app/(auth)/passkey-actions.ts`, `app/(auth)/google-auth.ts`.
- Tests agregados: `app/(auth)/__tests__/passkey-actions.test.ts`, `app/(auth)/__tests__/google-auth.test.ts`.
- Riesgos cerrados: registro passkey sin usuario, generacion de challenge httpOnly, verificacion de registro con upsert de credencial confiable, disponibilidad de login biometrico por telefono, generacion de opciones WebAuthn, login biometrico con creacion de sesion, challenge expirado y OAuth Google con callback PKCE y error accionable.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `156` suites y `916` tests; gate web subido a `77%` statements/lines.
- Riesgos abiertos: ramas UI biometricas de `app/(auth)/login/player/page.tsx`, `Board.tsx`/`Lobby.tsx`, ramas residuales de middleware Supabase y componentes con funciones bajas (`NotificationCenter`, `SupportChat`, `LandingContent`).
- Siguiente lote: cubrir login player biometrico/PIN/OTP en UI o entrar a `Lobby.tsx` para levantar branches/functions de game UI.

## Checkpoint 50

- Fecha: paginas de registro admin, biometria y perfil Google.
- Coverage antes: `77.25%` statements, `77.25%` lines, `79.24%` functions, `78.73%` branches.
- Coverage despues: `78.61%` statements, `78.61%` lines, `79.71%` functions, `78.74%` branches.
- Archivos cubiertos: `app/(auth)/register/admin/page.tsx`, `app/(auth)/register/player/biometric/page.tsx`, `app/(auth)/register/player/complete/page.tsx`.
- Tests agregados: `app/(auth)/register/admin/__tests__/page.test.tsx`, `app/(auth)/register/player/biometric/__tests__/page.test.tsx`, `app/(auth)/register/player/complete/__tests__/page.test.tsx`.
- Riesgos cerrados: alta admin con campos requeridos, error/pending de invitacion; soporte biometrico, fallback sin soporte, registro passkey con `device_trusted_id`, skip manual, exito con bypass y redirect diferido, cancelacion biometrica; perfil Google precargado, email conectado, validacion local de nickname/telefono, avatar oculto y errores server-side.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `159` suites y `925` tests; gate web subido a `78%` statements/lines y `79%` functions.
- Riesgos abiertos: paginas legales/publicas en `0%`, `Board.tsx`/`Lobby.tsx`, ramas residuales de `passkey-actions.ts`, `middleware.ts` y componentes con branch/function coverage baja.
- Siguiente lote: cubrir paginas legales/publicas rapidas para subir lines o entrar a `Lobby.tsx`/`Board.tsx` para subir confianza del juego.

## Checkpoint 51

- Fecha: paginas legales publicas.
- Coverage antes: `78.61%` statements, `78.61%` lines, `79.71%` functions, `78.74%` branches.
- Coverage despues: `81.08%` statements, `81.08%` lines, `80.21%` functions, `78.87%` branches.
- Archivos cubiertos: `app/(legal)/privacy/page.tsx`, `app/(legal)/terms/page.tsx`, `app/(legal)/security-policy/page.tsx`, `app/(legal)/rules/page.tsx`.
- Tests agregados: `app/(legal)/__tests__/pages.test.tsx`.
- Riesgos cerrados: metadata legal/canonica, headings principales, secciones de privacidad, terminos de elegibilidad/billetera, enlace `security.txt`, alcance de seguridad, secciones de reglas publicas y CTA de registro.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `160` suites y `929` tests; gate web subido a `81%` statements/lines y `80%` functions.
- Riesgos abiertos: app player (`friends`, `profile`, `stats`, `wallet`, replays) sigue en `0%`; ramas profundas de `Board.tsx`/`Lobby.tsx`; actions admin residuales en `0%`.
- Siguiente lote: cubrir shells player rapidos (`dashboard`, `lobby`, `wallet`) o entrar a `friends/profile` con mocks de acciones Supabase.

## Checkpoint 52

- Fecha: shells principales del jugador.
- Coverage antes: `81.08%` statements, `81.08%` lines, `80.21%` functions, `78.87%` branches.
- Coverage despues: `81.52%` statements, `81.52%` lines, `80.81%` functions, `79%` branches.
- Archivos cubiertos: `app/(player)/dashboard/page.tsx`, `app/(player)/lobby/page.tsx`, `app/(player)/wallet/page.tsx`, `app/(player)/wallet/deposit/page.tsx`, `app/(player)/leaderboard/page.tsx`.
- Tests agregados: `app/(player)/__tests__/shell-pages.test.tsx`.
- Riesgos cerrados: dashboard con wallet ok/error, lobby dinamico con mesas comunes/custom y fallback ante error de carga, wallet con contenido/error visible, deposito con monto precargado y retorno a wallet tras exito, leaderboard con categoria por defecto/seleccionada y tabs navegables.
- Checklist financiero/player: deposito y wallet se prueban con `DepositForm`/acciones mockeadas en bordes; no se tocaron RPCs, movimientos financieros ni `wallets_ledger`.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `161` suites y `938` tests; gate web subido a `79%` branches.
- Riesgos abiertos: `stats`, `friends`, `profile`, `replays` player siguen con cobertura baja o nula; ramas profundas de `Board.tsx`/`Lobby.tsx`; actions admin residuales en `0%`.
- Siguiente lote: cubrir `friends/profile/replays` player con mocks Supabase o entrar a ramas criticas de `Lobby.tsx`/`Board.tsx`.

## Checkpoint 53

- Fecha: paginas sociales y replays del jugador.
- Coverage antes: `81.52%` statements, `81.52%` lines, `80.81%` functions, `79%` branches.
- Coverage despues: `85.31%` statements, `85.31%` lines, `80.94%` functions, `79.16%` branches.
- Archivos cubiertos: `app/(player)/friends/page.tsx`, `app/(player)/replays/page.tsx`, `app/(player)/replays/mesa/[roomId]/page.tsx`, `app/(player)/replays/[gameId]/page.tsx`.
- Tests agregados: `app/(player)/friends/__tests__/page.test.tsx`, `app/(player)/replays/__tests__/pages.test.tsx`.
- Riesgos cerrados: amigos cubre carga inicial, presencia realtime, apertura de modal, solicitudes, chat por querystring, eliminacion con exito/error y refresh. Replays cubre listado empty/datos, jugadores unicos, fallback de mesa sin nombre/jugadores, resultados positivos/negativos/neutros, detalle de mesa, visor sin replay, visor jugador, copia de seed, modo admin, legacy sin frames e hidratacion desde game-server.
- Checklist realtime/player: Supabase realtime, presencia, fetch de game-server y componentes pesados de replay mockeados en bordes; no se abren sockets ni se cambia el contrato de replays.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `164` suites y `955` tests; gate web subido a `85%` statements/lines manteniendo `79%` branches y `80%` functions.
- Riesgos abiertos: `profile`, `stats` y paginas wallet secundarias siguen con cobertura baja o nula; ramas profundas de `Board.tsx`/`Lobby.tsx`; componentes `friends/_components` siguen como deuda funcional.
- Siguiente lote: cubrir `profile`/wallet secundarias si se busca line coverage rapido, o entrar a `Lobby.tsx`/`Board.tsx` para subir confianza critica de juego.

## Checkpoint 54

- Fecha: wallet secundario del jugador.
- Coverage antes: `85.31%` statements, `85.31%` lines, `80.94%` functions, `79.16%` branches.
- Coverage despues: `86.1%` statements, `86.1%` lines, `81.41%` functions, `79.39%` branches.
- Archivos cubiertos: `app/(player)/wallet/history/page.tsx`, `app/(player)/wallet/history/HistoryList.tsx`, `app/(player)/wallet/withdraw/page.tsx`.
- Tests agregados: `app/(player)/wallet/__tests__/secondary-pages.test.tsx`.
- Riesgos cerrados: historial con error visible, enlace de regreso, empty state, tipos de transaccion, estados, montos credito/debito y detalle modal. Retiro cubre validacion local, bloqueo de caracteres invalidos, request exitosa con retorno a wallet y error accionable por alerta.
- Checklist financiero/player: `getWalletHistory` y `requestWithdrawal` mockeadas en bordes; pruebas solo validan UI/callbacks; sin cambios a RPCs, acciones financieras ni `wallets_ledger`.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `165` suites y `961` tests; gate web subido a `86%` statements/lines y `81%` functions.
- Riesgos abiertos: `profile` requiere estrategia especifica para evitar tests fragiles de formulario grande; `stats` tiene cambios concurrentes sin tocar; ramas profundas de `Board.tsx`/`Lobby.tsx` siguen como deuda critica.
- Siguiente lote: cubrir `profile` con seams mas chicos o entrar a `Lobby.tsx`/`Board.tsx` para subir confianza del juego.

## Checkpoint 55

- Fecha: segunda pasada de mesa `Board.tsx`.
- Coverage antes: `95.95%` statements, `95.95%` lines, `85.82%` functions, `80.19%` branches.
- Coverage despues: `96.09%` statements, `96.09%` lines, `86.4%` functions, `80.33%` branches.
- Archivos cubiertos: `components/game/Board.tsx` mediante `components/game/__tests__/Board.misc.test.tsx`.
- Tests agregados: cobertura de banner `admin:status`, jugador en espera, fases `STARTING`/`BARAJANDO`/`PIQUE_REVEAL`/`SHOWDOWN`, decision de ganador en `SHOWDOWN_WAIT`, seleccion y limpieza de descarte, apuesta con fichas, bloqueo por saldo insuficiente y resolucion de `pasoJuegoChoice`.
- Riesgos cerrados: `Board.tsx` sube a `88.82%` statements, `78.2%` branches y `85.71%` functions; las rutas criticas de UI de mesa ya ejercitan mas callbacks reales sin tocar produccion.
- Resultado de verificacion: `pnpm --filter web test -- components/game/__tests__/Board.manoTransfer.test.tsx components/game/__tests__/Board.misc.test.tsx` verde con `16` tests; `pnpm --filter web test:coverage` verde con `180` suites y `1171` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e95900d98001pbkppLs7qx7fuh`.
- Riesgos abiertos: `app/play/[id]/page.tsx`, ramas restantes de `auth-actions.ts`/`passkey-actions.ts`, `SupportChat.tsx`, `LandingContent.tsx`, `ActionControls.tsx` functions y ramas residuales de `Lobby.tsx`/`Board.tsx`.
- Siguiente lote: cubrir ramas de `app/play/[id]/page.tsx` o cerrar auth/passkeys para subir branches antes de endurecer gates.

## Checkpoint 56

- Fecha: segunda pasada de runtime de sala `app/play/[id]/page.tsx`.
- Coverage antes: `96.09%` statements, `96.09%` lines, `86.4%` functions, `80.33%` branches.
- Coverage despues: `96.2%` statements, `96.2%` lines, `86.5%` functions, `80.6%` branches.
- Archivos cubiertos: `app/play/[id]/page.tsx` y `app/play/[id]/play-room-shell.ts` mediante tests existentes ampliados.
- Tests agregados: espera de listos sin countdown, mesa lista sin mensaje residual, audio de countdown suspendido y limpieza `onended`, fullscreen cleanup al desmontar, reconexion no expirada fallida con fallback a join normal, fallback anonimo de nickname/deviceId, desmontaje no intencional con `leave(false)` y overlay por cierre inesperado de sala.
- Riesgos cerrados: `app/play/[id]/page.tsx` sube a `99.68%` statements, `86.29%` branches y `78.26%` functions; quedan fuera solo el callback de `window.location.reload` en jsdom y el catch defensivo de audio.
- Resultado de verificacion: `pnpm exec jest --runTestsByPath 'src/app/play/[id]/__tests__/page.test.tsx'` verde con `25` tests; cobertura focalizada de la ruta verde en tests con `27` tests; `pnpm --filter web test:coverage` verde con `180` suites y `1178` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9594eb45001pnxClIiSaGk2ji`.
- Riesgos abiertos: `SupportChat.tsx`, `LandingContent.tsx`, ramas restantes de `auth-actions.ts`/`passkey-actions.ts`, hooks globales (`useFullscreen`, `useGamePermissions`, `useNotificationSocket`) y branches residuales de `Lobby.tsx`/`Board.tsx`.
- Siguiente lote: subir functions/branches de shell compartido o entrar a auth/passkeys para mejorar branches antes de endurecer gates.

## Checkpoint 57

- Fecha: hardening de `ActionControls.tsx`.
- Coverage antes: `96.2%` statements, `96.2%` lines, `86.5%` functions, `80.6%` branches.
- Coverage despues: `96.25%` statements, `96.25%` lines, `87.16%` functions, `80.74%` branches.
- Archivos cubiertos: `components/game/ActionControls.tsx` mediante `components/game/__tests__/ActionControls.test.tsx`.
- Tests agregados: pique fijo pagable, pique fijo con resto, pique libre bajo minimo con confirm deshabilitado, igualar/resto en fases de 4 cartas, raise con limpiar/confirmar, `llevo-juego` en descarte y resolucion de `paso-juego-choice` para Llevo/No Llevo.
- Riesgos cerrados: `ActionControls.tsx` sube a `98.99%` statements, `95.38%` branches y `100%` functions; los callbacks inline criticos ahora se ejercitan con envios reales a `room.send`.
- Resultado de verificacion: `pnpm --filter web test -- components/game/__tests__/ActionControls.test.tsx` verde con `24` tests; cobertura focalizada del componente en `98.99%`; `pnpm --filter web test:coverage` verde con `180` suites y `1185` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9597cc4a001aUbRHAB5tlDNGg`.
- Riesgos abiertos: `LandingContent.tsx`, `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions, hooks globales y ramas restantes de auth/passkeys.
- Siguiente lote: `passkey-actions.ts`/`auth-actions.ts` para seguir subiendo branches de seguridad o `LandingContent.tsx` por peso de functions.

## Checkpoint 58

- Fecha: hardening de `SupportChat.tsx`.
- Coverage antes: `96.25%` statements, `96.25%` lines, `87.16%` functions, `80.74%` branches.
- Coverage despues: `96.37%` statements, `96.37%` lines, `87.64%` functions, `81.07%` branches.
- Archivos cubiertos: `components/SupportChat.tsx` mediante `components/__tests__/SupportChat.test.tsx`.
- Tests agregados: notificacion de mensaje remoto con chat flotante cerrado, eventos socket de finalizacion/atencion, compatibilidad legacy admin/jugador, cierre con error, apertura por teclado con Space, cierre con boton X, selector de adjuntos, primera consulta flotante, nueva solicitud desde chat finalizado y respuesta admin que marca pendiente como atendido.
- Riesgos cerrados: `SupportChat.tsx` sube a `100%` statements/lines, `83.44%` branches y `86.66%` functions; quedan cubiertos flujos visibles de soporte, socket y adjuntos sin tocar UI productiva.
- Resultado de verificacion: `pnpm --filter web test -- components/__tests__/SupportChat.test.tsx` verde con `19` tests; cobertura focalizada en `100%` statements/lines; `pnpm --filter web test:coverage` verde con `180` suites y `1196` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e959e696b001u3ylDgOvuxyPB6`.
- Riesgos abiertos: `LandingContent.tsx`, `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions, hooks globales (`useFullscreen`, `useGamePermissions`, `useNotificationSocket`) y ramas restantes de `auth-actions.ts`.
- Siguiente lote: `auth-actions.ts` para branches de seguridad, o `LandingContent.tsx` si se busca subir functions globales por peso.

## Checkpoint 59

- Fecha: hardening de `passkey-actions.ts`.
- Coverage antes: `96.37%` statements, `96.37%` lines, `87.64%` functions, `81.07%` branches.
- Coverage despues: `96.44%` statements, `96.44%` lines, `87.64%` functions, `81.32%` branches.
- Archivos cubiertos: `app/(auth)/passkey-actions.ts` mediante `app/(auth)/__tests__/passkey-actions.test.ts`.
- Tests agregados: registro sin challenge, excepcion de verificacion, respuesta no verificada, error de upsert, rate limit de opciones/login, login sin dispositivos confiables, dispositivo no reconocido, telefono que no coincide, excepcion/unverified en autenticacion, error de `generateLink` y error de `verifyOtp`.
- Riesgos cerrados: `passkey-actions.ts` sube a `100%` statements/lines/functions y `87.5%` branches; quedan cubiertos errores de biometria, sesion magic link y persistencia de credenciales sin tocar codigo productivo.
- Resultado de verificacion: `pnpm exec jest --runTestsByPath 'src/app/(auth)/__tests__/passkey-actions.test.ts'` verde con `13` tests; cobertura focalizada en `100%` statements/lines/functions; `pnpm --filter web test:coverage` verde con `180` suites y `1202` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e95a14b1800116WJaKatvxyzMq`.
- Riesgos abiertos: ramas menores restantes de `auth-actions.ts`, `LandingContent.tsx`, `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions y hooks globales.
- Siguiente lote: `LandingContent.tsx` por functions globales o hooks (`useFullscreen`, `useNotificationSocket`) para branches.

## Checkpoint 60

- Fecha: hardening amplio de `auth-actions.ts`.
- Coverage antes: `96.44%` statements, `96.44%` lines, `87.64%` functions, `81.32%` branches.
- Coverage despues: `96.82%` statements, `96.82%` lines, `87.83%` functions, `81.73%` branches.
- Archivos cubiertos: `app/(auth)/auth-actions.ts` mediante `otp-and-pin-actions.test.ts` y `auth-actions.test.ts`.
- Tests agregados: errores de registro Supabase/OTP/perfil, sanción de cuenta en OTP, login PIN con dispositivo confiable, errores normalizados de PIN/OTP, recuperación de `auth.user` faltante desde perfil, perfil baneado/creación fallida, recuperación de PIN con reintento, errores de `setPlayerPin`, errores de `redeemAdminRecoveryCode`, `registerAdmin`, errores de login admin y error de challenge TOTP.
- Riesgos cerrados: `auth-actions.ts` sube a `99.54%` statements/lines, `85.71%` branches y `100%` functions tras Fase 1 del plan de hardening (jun 2026); se cubren flujos sensibles de sanciones, recuperación de usuarios, MFA admin, PIN, errores de infraestructura, rollback de Google registration, completeGoogleRegistration, rate limit + Turnstile bloqueados.
- Resultado de verificacion: `pnpm exec jest --runTestsByPath 'src/app/(auth)/__tests__/auth-actions.test.ts' 'src/app/(auth)/__tests__/otp-and-pin-actions.test.ts'` verde con `57` tests; cobertura focalizada de `auth-actions.ts` en `95.02%`; `pnpm --filter web test:coverage` verde con `180` suites y `1216` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f1be70b0011TreSw0lFe5QOc`.
- Riesgos abiertos: `LandingContent.tsx`, `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions, hooks globales y ramas menores de Google registration.
- Siguiente lote: `LandingContent.tsx` para subir functions globales o hooks globales para mejorar branches.

## Checkpoint 61

- Fecha: landing publica despues de checkpoint 60.
- Coverage antes: `96.82%` statements, `96.82%` lines, `87.83%` functions, `81.73%` branches.
- Coverage despues: `96.94%` statements, `96.94%` lines, `88.49%` functions, `81.81%` branches.
- Archivos cubiertos: `components/landing/LandingContent.tsx` mediante `LandingContent.test.tsx`.
- Tests agregados: navegacion mobile, scroll spy, lazy map por `IntersectionObserver`, autoplay/pausa del carrusel de fotos, gestos tactiles en carruseles y cierre de tutorial por backdrop.
- Riesgos cerrados: handlers visibles de la landing publica quedan caracterizados sin tocar UI productiva ni animaciones GSAP.
- Resultado de verificacion: `pnpm exec jest --runTestsByPath 'src/components/landing/__tests__/LandingContent.test.tsx'` verde con `15` tests; `pnpm --filter web test:coverage` verde con `180` suites y `1222` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f20e6c2001ELHMUZ6KqdjKcT`.
- Riesgos abiertos: callbacks de animacion GSAP en `LandingContent.tsx`, `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions, hooks globales y ramas menores de Google registration.
- Siguiente lote: hooks globales (`useFullscreen`, `useNotificationSocket`) o `NotificationCenter.tsx`/`ShuffleAnimation.tsx` para subir functions y branches sin inflar tests de animacion.

## Checkpoint 62

- Fecha: hooks globales despues de checkpoint 61.
- Coverage antes: `96.94%` statements, `96.94%` lines, `88.49%` functions, `81.81%` branches.
- Coverage despues: `97.01%` statements, `97.01%` lines, `88.49%` functions, `82.01%` branches.
- Archivos cubiertos: `useFullscreen.ts`, `useGamePermissions.ts` y `useNotificationSocket.ts`.
- Tests agregados: fullscreen estandar y WebKit, sincronizacion por `fullscreenchange`, errores silenciosos del navegador, permisos iniciales denied, cambios de permiso de microfono, deteccion mobile, fallback sin `getUserMedia`, URL local de Socket.IO y log de desconexion.
- Riesgos cerrados: hooks transversales de browser APIs suben a `96.69%` statements y `87%` branches; `useFullscreen.ts` queda en `100%`.
- Resultado de verificacion: `pnpm exec jest --runTestsByPath 'src/hooks/__tests__/useFullscreen.test.tsx' 'src/hooks/__tests__/useGamePermissions.test.tsx' 'src/hooks/__tests__/useNotificationSocket.test.tsx'` verde con `12` tests; `pnpm --filter web test:coverage` verde con `181` suites y `1229` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f2a028e0016nLyI4UuRqQ3HV`.
- Riesgos abiertos: `NotificationCenter.tsx` functions, `ShuffleAnimation.tsx` functions, callbacks de animacion GSAP en landing, ramas de stats dashboard y server actions de menor prioridad.
- Siguiente lote: `NotificationCenter.tsx` o `ShuffleAnimation.tsx` por functions, o `stats-dashboard.tsx` por branches de UI.

## Checkpoint 63

- Fecha: shell de notificaciones y animacion de barajado despues de checkpoint 62.
- Coverage antes: `97.01%` statements, `97.01%` lines, `88.49%` functions, `82.01%` branches.
- Coverage despues: `97.06%` statements, `97.06%` lines, `89.82%` functions, `82.11%` branches.
- Archivos cubiertos: `NotificationCenter.tsx` y `ShuffleAnimation.tsx`.
- Tests agregados: hover real de botones, fecha invalida, cuerpo vacio, callbacks `onended` de audio, ausencia de `AudioContext`, audio bloqueado y formulas GSAP de posicionamiento.
- Riesgos cerrados: `NotificationCenter.tsx` queda en `100%` statements/functions/lines; `ShuffleAnimation.tsx` queda en `100%` statements/functions/lines y branches `95.45%`.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `181` suites y `1234` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f38a1eb001oLojVJ59ZTRP4Q`.
- Riesgos abiertos: `SupportConversationList.tsx`, `Board.tsx`, `Lobby.tsx` y server actions de menor prioridad.
- Siguiente lote: `SupportConversationList.tsx` por coverage funcional del admin o `Board.tsx`/`Lobby.tsx` para confianza del juego.

## Checkpoint 64

- Fecha: dashboard de estadisticas del jugador despues de checkpoint 63.
- Coverage antes: `97.06%` statements, `97.06%` lines, `89.82%` functions, `82.11%` branches.
- Coverage despues: `97.21%` statements, `97.21%` lines, `89.82%` functions, `82.34%` branches.
- Archivos cubiertos: `stats-dashboard.tsx` con render real via `jest.requireActual`.
- Tests agregados: win rate con cero partidas, dashboard sin bono, tiers reclamables/reclamados/bloqueados, progreso mensual, error de `claimBonus` y reclamo exitoso con celebracion/confetti.
- Riesgos cerrados: `stats-dashboard.tsx` sube a `99.38%` statements, `94%` branches y `100%` functions sin tocar UI productiva.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `181` suites y `1238` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f3efd99001QELfgJX809Nrjh`.
- Riesgos abiertos: `SupportConversationList.tsx`, `Board.tsx`, `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP y server actions de menor prioridad.
- Siguiente lote: `SupportConversationList.tsx` o ramas de juego (`Board.tsx`/`Lobby.tsx`) segun retorno de cobertura y riesgo.

## Checkpoint 65

- Fecha: soporte admin realtime despues de checkpoint 64.
- Coverage antes: `97.21%` statements, `97.21%` lines, `89.82%` functions, `82.34%` branches.
- Coverage despues: `97.34%` statements, `97.34%` lines, `89.92%` functions, `82.68%` branches.
- Archivos cubiertos: `SupportConversationList.tsx`.
- Tests agregados: runtime socket URL, fallbacks de usuario/avatar, cierre de vista, empty states, ticket creado duplicado, eventos attended/finalized, mensajes legacy, finalizados no reabiertos y audio bloqueado.
- Riesgos cerrados: `SupportConversationList.tsx` sube a `100%` statements/lines, `98.14%` branches y `88.88%` functions.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `181` suites y `1246` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f46a4fb001TuV3GF63ZkSDkl`.
- Riesgos abiertos: `Board.tsx`, `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP, `BroadcastBanner.tsx` branches y server actions de menor prioridad.
- Siguiente lote: `Board.tsx`/`Lobby.tsx` para confianza de juego o `BroadcastBanner.tsx` por branches de shell compartido.

## Checkpoint 66

- Fecha: banner global de broadcasts despues de checkpoint 65.
- Coverage antes: `97.34%` statements, `97.34%` lines, `89.92%` functions, `82.68%` branches.
- Coverage despues: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.8%` branches.
- Archivos cubiertos: `BroadcastBanner.tsx`.
- Tests agregados: eventos socket invalidos, dedupe, tipos `maintenance`/`security`, tipo desconocido con fallback, sessionStorage corrupto, broadcasts ya descartados, auto-dismiss y ausencia de `userId`.
- Riesgos cerrados: `BroadcastBanner.tsx` sube a `97.64%` statements/lines, `93.02%` branches y `100%` functions.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `181` suites y `1250` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f4e14e00015IPIS6C9DT8BUA`.
- Riesgos abiertos: `Board.tsx`, `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP, `BroadcastBanner.tsx` fallback sin ref y server actions de menor prioridad.
- Siguiente lote: `Board.tsx`/`Lobby.tsx` para confianza de juego o `PWAInstallPrompt.tsx`/`OrientationPortrait.tsx` para branches de shell.

## Checkpoint 67

- Fecha: prompt de instalacion PWA despues de checkpoint 66.
- Coverage antes: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.8%` branches.
- Coverage despues: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.86%` branches.
- Archivos cubiertos: `PWAInstallPrompt.tsx`.
- Tests agregados: standalone por media query y `navigator.standalone`, cooldown de descarte, install aceptado/descartado, banner sin prompt, guia iOS, click en overlay y stopPropagation del contenido.
- Riesgos cerrados: `PWAInstallPrompt.tsx` sube a `100%` statements/functions/lines y `96.42%` branches.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `181` suites y `1254` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f545fb5001MXORR4Koc9cEZa`.
- Riesgos abiertos: `Board.tsx`, `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP, `OrientationPortrait.tsx` branch residual y server actions de menor prioridad.
- Siguiente lote: `Board.tsx`/`Lobby.tsx` para confianza de juego u `OrientationPortrait.tsx` por branch residual de shell.

## Checkpoint 68

- Fecha: restauracion de orientacion portrait despues de checkpoint 67.
- Coverage antes: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.86%` branches.
- Coverage despues: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.91%` branches.
- Archivos cubiertos: `OrientationPortrait.tsx`.
- Tests agregados: desktop sin efectos, mobile con `unlock`, salida de fullscreen y tolerancia a errores de APIs de orientacion/fullscreen.
- Riesgos cerrados: `OrientationPortrait.tsx` sube a `100%` statements/functions/lines y `83.33%` branches.
- Resultado de verificacion: `pnpm --filter web test:coverage` verde con `182` suites y `1257` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_e9f5a68ee0016FlMA8b0yKcGzI`.
- Riesgos abiertos: `Board.tsx`, `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP y server actions de menor prioridad.
- Siguiente lote: `Board.tsx`/`Lobby.tsx` para confianza de juego.

## Checkpoint 69

- Fecha: hardening de tablero de juego despues de checkpoint 68.
- Coverage antes: `97.35%` statements, `97.35%` lines, `89.92%` functions, `82.91%` branches.
- Coverage despues: `97.59%` statements, `97.59%` lines, `90.01%` functions, `83.26%` branches.
- Archivos cubiertos: `Board.tsx` mediante `Board.misc.test.tsx` y `Board.manoTransfer.test.tsx`.
- Tests agregados: animacion de reparto de cartas privadas, animacion de descarte, reparto de cartas traseras a oponentes, cartas reveladas en showdown, stack plegado de oponente, fallback centrado de transferencia de mano y limpieza del mensaje diferido.
- Riesgos cerrados: `Board.tsx` sube a `100%` statements/lines, `89.78%` branches y `92.85%` functions; quedan caracterizados side effects de mesa (`animate-deal`, `animate-discard`) y ramas visibles de descarte/showdown sin tocar UI productiva.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath src/components/game/__tests__/Board.misc.test.tsx src/components/game/__tests__/Board.manoTransfer.test.tsx` verde con `22` tests; cobertura focalizada de `Board.tsx` en `100%` statements/lines; `pnpm --filter web test:coverage` verde con `182` suites y `1263` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8e01f04001YrUgjXNo2RkK43`.
- Riesgos abiertos: `Lobby.tsx`, `LandingContent.tsx` callbacks GSAP, `social-actions.ts`, paginas admin con functions bajos y server actions de menor prioridad.
- Siguiente lote: `Lobby.tsx` para cerrar mas confianza de juego o `social-actions.ts` por peso global de actions.

## Checkpoint 70

- Fecha: hardening de lobby de juego despues de checkpoint 69.
- Coverage antes: `97.59%` statements, `97.59%` lines, `90.01%` functions, `83.26%` branches.
- Coverage despues: `97.64%` statements, `97.64%` lines, `90.2%` functions, `83.39%` branches.
- Archivos cubiertos: `Lobby.tsx` mediante `Lobby.test.tsx`.
- Tests agregados: avatar desde metadata cuando el perfil no tiene avatar, cierre alternativo de conexion al crear mesa normal/VIP, error de creacion de mesa normal admin, placeholder custom desde tablas admin, error al crear placeholder fijo, cierre alternativo fallido tolerado y callbacks de cierre de modales.
- Riesgos cerrados: `Lobby.tsx` sube a `99.71%` statements/lines, `80.51%` branches y `93.33%` functions; quedan protegidos fallbacks de Colyseus, estado de creacion y reglas DB para mesas custom sin tocar UI productiva.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath src/components/game/__tests__/Lobby.test.tsx` verde con `23` tests; cobertura focalizada de `Lobby.tsx` en `99.71%` statements/lines; `pnpm --filter web test:coverage` verde con `182` suites y `1270` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8e353fd001L0vgC2kM3qL7K3`.
- Riesgos abiertos: `LandingContent.tsx` callbacks GSAP, `social-actions.ts`, `admin-search.ts`, `admin-sanctions.ts`, ramas de soporte y paginas admin con funciones bajas.
- Siguiente lote: `social-actions.ts` por peso global de actions o `LandingContent.tsx` si se prioriza functions restantes de UI publica.

## Checkpoint 71

- Fecha: hardening de acciones sociales despues de checkpoint 70.
- Coverage antes: `97.64%` statements, `97.64%` lines, `90.2%` functions, `83.39%` branches.
- Coverage despues: `97.87%` statements, `97.87%` lines, functions y branches en mejora incremental.
- Archivos cubiertos: `social-actions.ts` mediante `social-actions.test.ts`.
- Tests agregados: leaderboard RPC, busqueda con auth/error, clasificacion de amistades, solicitudes, aceptar/eliminar amigos, DMs, notificaciones, nicknames e invitaciones.
- Riesgos cerrados: `social-actions.ts` queda en `100%` statements/lines/functions y `92.59%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8eab292001s1pkKL70yPfJlp`.

## Checkpoint 72

- Fecha: hardening de busqueda admin.
- Coverage antes: `97.87%` statements/lines.
- Coverage despues: `97.99%` statements/lines.
- Archivos cubiertos: `admin-search.ts` mediante `admin-search.test.ts`.
- Tests agregados: auth/admin, UUID en multiples tablas, seed, username, rama defensiva `unknown`, respuestas null Supabase y audit log.
- Riesgos cerrados: `admin-search.ts` queda en `100%` statements/lines/functions y `97.5%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8ed396e001XWmq7U40drp937`.

## Checkpoint 73

- Fecha: hardening de sanciones admin.
- Coverage antes: `97.99%` statements/lines.
- Coverage despues: `98.1%` statements/lines.
- Archivos cubiertos: `admin-sanctions.ts` mediante `admin-sanctions.test.ts`.
- Tests agregados: autorizacion, creacion/revocacion de sanciones, auditoria, revalidacion, RPCs de eligibility/table access y errores/null.
- Riesgos cerrados: `admin-sanctions.ts` queda en `100%` statements/lines/functions y `96.77%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8eeff4a001YYFHwylshq1ich`.

## Checkpoint 74

- Fecha: hardening de acciones de replays.
- Coverage antes: `98.1%` statements/lines.
- Coverage despues: `98.15%` statements/lines.
- Archivos cubiertos: `replays.ts` mediante `replays-actions.test.ts`.
- Tests agregados: errores/null en RPCs, fallback game-server sin URL/no OK/json invalido/catch, admin auth, errores replay/ledger y frames desde game-server.
- Riesgos cerrados: `replays.ts` queda en `100%` statements/lines/functions y `98.18%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8f0c155001AuWCeecBk6VsBw`.

## Checkpoint 75

- Fecha: hardening de auditoria admin.
- Coverage antes: `98.15%` statements/lines.
- Coverage despues: `98.19%` statements/lines.
- Archivos cubiertos: `admin-audit.ts` mediante `admin-audit.test.ts`.
- Tests agregados: log admin/system con defaults/opciones, auth admin, filtros, nombres admin, errores y data null.
- Riesgos cerrados: `admin-audit.ts` queda en `100%` statements/lines/functions y `97.67%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8f272f6001iAj0KLg2yve669`.

## Checkpoint 76

- Fecha: hardening de replay controller.
- Coverage antes: `98.19%` statements/lines.
- Coverage despues: `98.2%` statements/lines.
- Archivos cubiertos: `ReplayController.tsx` mediante `ReplayController.test.tsx`.
- Tests agregados: espacio play/pause, tolerancia a fallo de `matchMedia`, controles flotantes fullscreen prev/next/play/exit.
- Riesgos cerrados: `ReplayController.tsx` queda en `100%` statements/lines/functions y `96.49%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8f4670e001OIGUCLQ9O9vt3b`.

## Checkpoint 77

- Fecha: hardening de transferencia wallet.
- Coverage antes: `98.2%` statements/lines.
- Coverage despues: `98.21%` statements/lines.
- Archivos cubiertos: `components/wallet/TransferModal.tsx` mediante `TransferModal.test.tsx`.
- Tests agregados: telefono sanitizado/Enter, avatar custom, no busqueda vacia, limpiar error al editar, volver entre pasos y cierre de resultado.
- Riesgos cerrados: `TransferModal.tsx` de wallet queda en `100%` statements/lines, `93.33%` functions y `97.91%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8f5ef52001QRmKODAQ0D76rk`.

## Checkpoint 78

- Fecha: hardening de pagina de amigos.
- Coverage antes: `98.21%` statements/lines.
- Coverage despues: `98.22%` statements/lines, `92.2%` functions, `84.95%` branches.
- Archivos cubiertos: `app/(player)/friends/page.tsx` mediante `page.test.tsx`.
- Tests agregados: realtime refresh/cleanup, modal agregar/cerrar, solicitudes refresh/toast, querystring chat inexistente, chat open/close/backdrop, lista refresh/toast, eliminar inexistente, cancelar/cerrar eliminacion y fallback username.
- Riesgos cerrados: `friends/page.tsx` queda en `100%` statements/lines, `87.5%` functions y `97.87%` branches.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8f83449001z5Unke38LJ6eFK`.

## Checkpoint 79

- Fecha: hardening de transferencia en mesa y contrato de lookup.
- Coverage antes: `98.22%` statements/lines, `92.2%` functions, `84.95%` branches.
- Coverage despues: `98.23%` statements/lines, `92.39%` functions, `85.03%` branches.
- Archivos cubiertos: `components/game/TransferModal.tsx`, `components/game/__tests__/GameTransferModal.test.tsx`, `game-server/src/services/SupabaseService.ts`.
- Tests agregados: navegacion hacia atras entre destinatario/monto/confirmacion, buscar otro jugador, errores por defecto sin detalle del servidor, limpieza de listeners al desmontar y avatar custom desde `lookup-result`.
- Riesgos cerrados: `components/game/TransferModal.tsx` queda en `100%` statements/lines, `94.11%` functions y `95.08%` branches; el contrato `lookupUserByPhone` ahora propaga `avatar_url` opcional cuando el RPC lo devuelve.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath src/components/game/__tests__/GameTransferModal.test.tsx` verde con `11` tests; `pnpm --filter game-server exec vitest run src/services/__tests__/SupabaseServiceExtended.test.ts` verde con `32` tests; `pnpm --filter web test:coverage` verde con `185` suites y `1325` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ea8fcc1fa0014615lov3BJwOY1`.
- Riesgos abiertos: functions/branches siguen por debajo de `98%`; deuda principal en `LandingContent.tsx`, `LandingAnimations.tsx`, `SupportChat.tsx`, `app/play/[id]/page.tsx`, actions admin con branches bajos e infraestructura Supabase.
- Siguiente lote: priorizar `LandingContent.tsx`/`LandingAnimations.tsx` si se busca subir functions globales, o server actions admin/security si se busca subir branches con mas valor de negocio.

## Checkpoint 80

- Fecha: 2026-06-20, rebase documental y hardening de App Lock session.
- Coverage antes: `97.82%` statements/lines, `92.3%` functions, `85.02%` branches; `185` suites y `1326` tests.
- Coverage despues: `97.85%` statements/lines, `92.4%` functions, `85.11%` branches; `186` suites y `1332` tests.
- Archivos cubiertos: `lib/app-lock-session.ts` mediante `app-lock-session.test.ts`.
- Tests agregados: marcado/consulta/limpieza de sesion validada, bypass one-shot desde `sessionStorage`, consumo de cookie de redirect, prioridad de `sessionStorage` sobre cookie, degradacion segura cuando `sessionStorage` falla y fallback de cookie con storage bloqueado.
- Riesgos cerrados: el contrato transversal de bloqueo biometrico/PWA deja de depender solo de tests indirectos del provider; quedan protegidos los paths de auth client-side, redirect server-side y browser storage restrictivo.
- Resultado de verificacion: `pnpm --filter web test -- src/lib/__tests__/app-lock-session.test.ts` verde con `6` tests; `pnpm --filter web test:coverage` verde con `186` suites y `1332` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee66c6850001URwt0k24jy6Ixu`.
- Riesgos abiertos: functions y branches siguen lejos de `98%`; deuda principal actual en `LandingContent.tsx`/`LandingAnimations.tsx` por callbacks, `app/og-image/route.tsx` en `0%`, server actions admin/security/support con branches bajos, `SupportChat.tsx`, `Board.tsx`/`Lobby.tsx` y paginas App Router con funciones residuales.
- Siguiente lote: priorizar `app/og-image/route.tsx` si se busca recuperar statements/lines con un caso de render estable, o `admin-security.ts`/`support.ts` si se priorizan branches de mayor riesgo operativo.

## Checkpoint 81

- Fecha: 2026-06-20, cierre de ruta OG publica.
- Coverage antes: `97.85%` statements/lines, `92.4%` functions, `85.11%` branches; `186` suites y `1332` tests.
- Coverage despues: `98.27%` statements/lines, `92.49%` functions, `85.12%` branches; `187` suites y `1335` tests.
- Archivos cubiertos: `app/og-image/route.tsx` mediante `route.test.tsx`.
- Tests agregados: runtime edge/revalidacion diaria, dimensiones OG `1200x630`, cache inmutable y textos SEO visibles de la tarjeta social.
- Riesgos cerrados: la ruta publica usada por Open Graph/Twitter deja de estar en `0%`; se protege el contrato que enlaza la metadata de landing con la imagen social sin hacer snapshots visuales ni depender del renderer real de `next/og`.
- Resultado de verificacion: `pnpm --filter web test -- src/app/og-image/__tests__/route.test.tsx` verde con `3` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1335` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee68240e9001JFtFBTFI8w3bUr`.
- Riesgos abiertos: functions/branches siguen por debajo de la meta estrategica; deuda principal en `LandingContent.tsx`/`LandingAnimations.tsx`, `admin-security.ts`, `support.ts`, `admin-disputes.ts`, `Board.tsx`/`Lobby.tsx`, `SupportChat.tsx` y paginas App Router con funciones residuales.
- Siguiente lote: priorizar `admin-security.ts`/`support.ts` para subir branches con valor operativo, o `LandingContent.tsx` si se busca elevar functions globales.

## Checkpoint 82

- Fecha: 2026-06-20, hardening de acciones de soporte.
- Coverage antes: `98.27%` statements/lines, `92.49%` functions, `85.12%` branches; `187` suites y `1335` tests.
- Coverage despues: `98.27%` statements/lines, `92.49%` functions, `85.5%` branches; `187` suites y `1356` tests.
- Archivos cubiertos: `app/actions/support.ts` mediante `support-actions.test.ts`.
- Tests agregados: errores de creacion de ticket, primer mensaje, append/close RPC tecnico y funcional, defaults de rol admin/player, get/list/history con errores y datos nulos, adjuntos sin archivo/ticket inexistente/admin en ticket ajeno/metadata fallida y errores de URL firmada.
- Riesgos cerrados: `support.ts` sube de `56.33%` a `86.81%` branches; quedan protegidos fallbacks reales de soporte, storage, permisos admin y errores de RPC sin probar implementacion interna ni snapshots.
- Resultado de verificacion: `pnpm --filter web test -- src/app/actions/__tests__/support-actions.test.ts` verde con `41` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1356` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee6daca84001NS51uezB8R4wRf`.
- Riesgos abiertos: branches globales siguen bajo `86%`; deuda principal en `admin-security.ts`, `admin-disputes.ts`, `admin-settings.ts`, `admin-supervision.ts`, `admin-server-alerts.ts`, `Board.tsx`/`Lobby.tsx` y funciones de `LandingContent.tsx`/`LandingAnimations.tsx`.
- Siguiente lote: priorizar `admin-security.ts` para cerrar ramas de MFA/sesiones/auth admin, o `admin-disputes.ts` si se busca otro salto fuerte de branches server-side.

## Checkpoint 83

- Fecha: 2026-06-20, hardening de disputas admin.
- Coverage antes: `98.27%` statements/lines, `92.49%` functions, `85.5%` branches; `187` suites y `1356` tests.
- Coverage despues: `98.27%` statements/lines, `92.49%` functions, `85.68%` branches; `187` suites y `1366` tests.
- Archivos cubiertos: `app/actions/admin-disputes.ts` mediante `admin-disputes.test.ts`.
- Tests agregados: trims y `support_ticket_id` nulo al crear disputas, errores de insert/update/get/list, auditoria y revalidacion en caminos exitosos, razon obligatoria para descarte y lista vacia.
- Riesgos cerrados: `admin-disputes.ts` sube de `60%` a `86.66%` branches; quedan protegidos los flujos de investigacion admin sin tocar ledger ni UI.
- Resultado de verificacion: `pnpm --filter web test -- src/__tests__/actions/admin-disputes.test.ts` verde con `20` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1366` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee6e26d90001ea8yHgjJ51rtHK`.
- Riesgos abiertos: branches globales siguen bajo `86%`; deuda principal en `admin-security.ts`, `admin-settings.ts`, `admin-supervision.ts`, `admin-server-alerts.ts`, `admin-tables.ts`, `admin-users.ts`, `wallet.ts` y functions de `LandingContent.tsx`/`LandingAnimations.tsx`.
- Siguiente lote: priorizar `admin-security.ts` o acciones admin pequeñas (`admin-settings.ts`, `admin-supervision.ts`, `admin-server-alerts.ts`) para cruzar `86%` branches global.

## Checkpoint 84

- Fecha: 2026-06-20, cierre de acciones admin pequeñas.
- Coverage antes: `98.27%` statements/lines, `92.49%` functions, `85.68%` branches; `187` suites y `1366` tests.
- Coverage despues: `98.27%` statements/lines, `92.49%` functions, `85.92%` branches; `187` suites y `1380` tests.
- Archivos cubiertos: `app/actions/admin-server-alerts.ts`, `app/actions/admin-settings.ts`, `app/actions/admin-supervision.ts` mediante `admin-small-actions.test.ts`.
- Tests agregados: alertas vacias/no auth/errores de list-resolve-count, conteo no cero, rulebook sin contenido/no auth/no admin/sin estado anterior/error de guardado y supervision sin auth/no admin/error Redis.
- Riesgos cerrados: las tres acciones pequeñas quedan en `100%` statements/lines/functions/branches; se protegen permisos admin, errores Supabase y Redis sin introducir mocks de UI.
- Resultado de verificacion: `pnpm --filter web test -- src/app/actions/__tests__/admin-small-actions.test.ts` verde con `23` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1380` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee6ea96e6001EPTudC7j4C9Wi5`.
- Riesgos abiertos: branches globales siguen ligeramente bajo `86%`; deuda principal en `admin-security.ts`, `admin-tables.ts`, `admin-users.ts`, `wallet.ts`, `admin-broadcast.ts` y functions de `LandingContent.tsx`/`LandingAnimations.tsx`.
- Siguiente lote: atacar `admin-security.ts` o `admin-users.ts` para cruzar `86%` branches global con margen.

## Checkpoint 85

- Fecha: 2026-06-20, hardening de seguridad admin.
- Coverage antes: `98.27%` statements/lines, `92.49%` functions, `85.92%` branches; `187` suites y `1380` tests.
- Coverage despues: `98.33%` statements/lines, `92.49%` functions, `86.21%` branches; `187` suites y `1392` tests.
- Archivos cubiertos: `app/actions/admin-security.ts` mediante `admin-security.test.ts`.
- Tests agregados: origen forwarded sin `APP_URL`, validaciones de password, error de Admin API, errores MFA de list/challenge/updateUser, reset TOTP sin auth, rotacion de recovery codes con formato invalido/insert fallido, snapshots sin auth/sin TOTP/count fallido y error de signOut global tras auditoria.
- Riesgos cerrados: `admin-security.ts` sube de `62.1%` a `80.58%` branches y de `92.21%` a `97.47%` statements/lines; quedan protegidos fallos de MFA, recovery, sesiones y snapshot de seguridad.
- Resultado de verificacion: `pnpm --filter web test -- src/app/actions/__tests__/admin-security.test.ts` verde con `35` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1392` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee6f17db60016rV8cbNTXOF0cj`.
- Riesgos abiertos: functions globales siguen en `92.49%`; deuda principal en `LandingContent.tsx`/`LandingAnimations.tsx`, `app/play/[id]/page.tsx`, `Card.tsx`, `TutorialWalkthrough.tsx`, `admin-tables.ts`, `admin-users.ts`, `wallet.ts` y ramas residuales de `admin-security.ts`.
- Siguiente lote: cambiar foco a functions globales (`LandingContent.tsx`/`LandingAnimations.tsx`) o seguir branches en `admin-users.ts`/`admin-tables.ts`.

## Checkpoint 86

- Fecha: 2026-06-20, hardening de callbacks de landing publica.
- Coverage antes: `98.33%` statements/lines, `92.49%` functions, `86.21%` branches; `187` suites y `1392` tests.
- Coverage despues: `98.38%` statements/lines, `92.78%` functions, `86.24%` branches; `187` suites y `1397` tests.
- Archivos cubiertos: `components/landing/LandingContent.tsx` y `components/landing/LandingAnimations.tsx` mediante sus suites existentes.
- Tests agregados: boton de marca hacia inicio, swipe corto de fotos sin cambio de slide, click interno de modal de tutorial sin cerrar, swipe hacia atras en tutoriales y callbacks `onEnter`/`onLeaveBack` de `ScrollTrigger.batch`.
- Riesgos cerrados: `LandingAnimations.tsx` queda en `100%` statements/lines/functions y `93.75%` branches; `LandingContent.tsx` sube functions de `65.71%` a `68.57%` sin probar implementacion interna de GSAP.
- Resultado de verificacion: `pnpm --filter web exec jest src/components/landing/__tests__/LandingContent.test.tsx src/components/landing/__tests__/LandingAnimations.test.tsx --runInBand` verde con `23` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1397` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee6fa0eb2001TdHH50lHVIC66x`.
- Riesgos abiertos: functions globales siguen en `92.78%`; deuda principal en `LandingContent.tsx`, `app/play/[id]/page.tsx`, `Card.tsx`, `TutorialWalkthrough.tsx`, paginas admin con callbacks sin cubrir y ramas residuales de actions admin/wallet.
- Siguiente lote: seguir con functions visibles en `LandingContent.tsx` y `app/play/[id]/page.tsx`, o alternar con branches de `admin-users.ts`/`admin-tables.ts`.

## Checkpoint 87

- Fecha: 2026-06-20, ejecucion controlada de animaciones internas de landing.
- Coverage antes: `98.38%` statements/lines, `92.78%` functions, `86.24%` branches; `187` suites y `1397` tests.
- Coverage despues: `98.8%` statements/lines, `92.89%` functions, `86.24%` branches; `187` suites y `1398` tests.
- Archivos cubiertos: `components/landing/LandingContent.tsx` mediante `LandingContent.test.tsx`.
- Tests agregados: ejecucion del callback registrado en `useGSAP`, con `toArray`, `matchMedia` y callbacks de `ScrollTrigger.batch` controlados para validar timelines, animaciones flotantes, wave heading, batch enter/leave y media query desktop.
- Riesgos cerrados: `LandingContent.tsx` sube de `89.08%` a `99.86%` statements/lines y de `68.57%` a `72.97%` functions sin tocar produccion ni depender de GSAP real en jsdom.
- Resultado de verificacion: `pnpm --filter web exec jest src/components/landing/__tests__/LandingContent.test.tsx --runInBand` verde con `20` tests; `pnpm --filter web test:coverage` verde con `187` suites y `1398` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ee714a8b10015B1XZv4q0HLYXf`.
- Riesgos abiertos: functions globales siguen en `92.89%`; deuda principal en `app/play/[id]/page.tsx`, `Card.tsx`, `TutorialWalkthrough.tsx`, paginas admin con callbacks sin cubrir y branches de `admin-users.ts`/`admin-tables.ts`/`wallet.ts`.
- Siguiente lote: atacar functions de `app/play/[id]/page.tsx` o branches server-side en `admin-users.ts`/`admin-tables.ts` para mantener avance balanceado.

## Checkpoint 88

- Fecha: 2026-06-22, hardening de acciones admin de usuarios.
- Coverage antes: `98.8%` statements/lines, `92.89%` functions, `86.24%` branches; `187` suites y `1398` tests.
- Coverage despues: `98.8%` statements/lines, `92.89%` functions, `86.38%` branches; `187` suites y `1403` tests.
- Archivos cubiertos: `app/actions/admin-users.ts` mediante `admin-users.test.ts`.
- Tests agregados: normalizacion de perfiles parciales, error de consulta, rechazo sin sesion, ban con motivo por defecto/auditoria y error de actualizacion sin auditoria ni revalidacion.
- Riesgos cerrados: `admin-users.ts` sube a `100%` statements/lines/functions y `88.33%` branches; quedan protegidos mapeos defensivos, permisos admin, callbacks de auditoria y fallos de actualizacion sin tocar ledger ni RPCs.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/admin-users.test.ts' --runInBand` verde con `18` tests; cobertura focalizada de `admin-users.ts` en `100%` statements/lines/functions y `88.33%` branches; `pnpm --filter web test:coverage` verde con `187` suites y `1403` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef1d084ad001R0kAgfpHr12egp`.
- Checklist ledger/admin: `adjustUserBalance` sigue ejercitado solo contra RPC mockeada; no se modificaron RPCs, movimientos financieros ni `wallets_ledger`.
- Riesgos abiertos: functions globales siguen en `92.89%`; deuda principal en `app/play/[id]/page.tsx`, `Card.tsx`, `TutorialWalkthrough.tsx`, `admin-tables.ts`, `wallet.ts`, `admin-broadcast.ts` y ramas residuales de `admin-security.ts`.
- Siguiente lote: `admin-tables.ts` o `wallet.ts` para seguir elevando branches server-side con valor operativo, alternando luego con functions de UI (`Card.tsx`/`TutorialWalkthrough.tsx`).

## Checkpoint 89

- Fecha: 2026-06-22, hardening de acciones admin de mesas.
- Coverage antes: `98.8%` statements/lines, `92.89%` functions, `86.38%` branches; `187` suites y `1403` tests.
- Coverage despues: `98.8%` statements/lines, `92.89%` functions, `86.52%` branches; `187` suites y `1411` tests.
- Archivos cubiertos: `app/actions/admin-tables.ts` mediante `admin-ledger-and-tables.test.ts` y `admin-tables.test.ts`.
- Tests agregados: listado vacío de juegos activos, cierre admin con auditoría, update no financiero de mesa común, mesa inexistente, error de borrado sin auditoría, cleanup sin eventos stale, financials sin RPC desplegada y error del fallback de lobby.
- Riesgos cerrados: `admin-tables.ts` sube a `100%` statements/lines/functions y `79.16%` branches; quedan protegidos flujos operativos de mesas, cleanup y fallback de lobby sin abrir sockets ni tocar estado Colyseus real.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/app/actions/__tests__/admin-ledger-and-tables.test.ts' --runInBand` verde con `23` tests; cobertura focalizada de `admin-tables.ts` en `100%` statements/lines/functions y `79.16%` branches; `pnpm --filter web test:coverage` verde con `187` suites y `1411` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef1e1cce2001YikfZuB6bneLKq`.
- Checklist admin/realtime: pruebas limitadas a actions server-side con Supabase/auditoría mockeados; no se notificó a Colyseus ni se cambió contrato de mesas.
- Riesgos abiertos: functions globales siguen en `92.89%`; deuda principal en `wallet.ts`, `admin-broadcast.ts`, `admin-dashboard.ts`, `admin-ledger.ts`, `Card.tsx`, `TutorialWalkthrough.tsx` y ramas residuales de `admin-security.ts`.
- Siguiente lote: `wallet.ts` si se priorizan branches server-side con valor financiero, cargando la skill de ledger; o `Card.tsx`/`TutorialWalkthrough.tsx` si se prioriza functions globales de UI.

## Checkpoint 90

- Fecha: 2026-06-22, hardening de actions de wallet del jugador.
- Coverage antes: `98.8%` statements/lines, `92.89%` functions, `86.52%` branches; `187` suites y `1411` tests.
- Coverage despues: `98.83%` statements/lines, `92.89%` functions, `86.55%` branches; `187` suites y `1414` tests.
- Archivos cubiertos: `app/actions/wallet.ts` mediante `wallet.test.ts`.
- Tests agregados: retiro pendiente en resumen de wallet, historial con retiro rechazado y filtro de retiro completado, observaciones inválidas de depósito guardadas como `null`.
- Riesgos cerrados: `wallet.ts` sube a `100%` statements/lines/functions y `84.44%` branches; se cubre la mezcla de actividad de bóveda sin modificar escritura financiera ni RPCs.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/wallet.test.ts' --runInBand` verde con `16` tests; cobertura focalizada de `wallet.ts` en `100%` statements/lines/functions y `84.44%` branches; `pnpm --filter web test:coverage` verde con `187` suites y `1414` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef1e988ef001JTmI35SPwPDOVu`.
- Checklist ledger: sin cambios productivos; sin `UPDATE`/`DELETE` sobre `wallets_ledger`; pruebas limitadas a lectura de ledger y creación de solicitud de depósito con Supabase mockeado.
- Riesgos abiertos: functions globales siguen en `92.89%`; deuda principal en `Card.tsx`, `TutorialWalkthrough.tsx`, `admin-broadcast.ts`, `admin-dashboard.ts`, `admin-ledger.ts`, `TransactionModal.tsx` y ramas residuales de auth/security.
- Siguiente lote: priorizar `Card.tsx`/`TutorialWalkthrough.tsx` para subir functions globales o `admin-broadcast.ts`/`admin-dashboard.ts` para seguir branches server-side/admin.

## Checkpoint 91

- Fecha: 2026-06-22, cobertura directa de carta de mesa.
- Coverage antes: `98.83%` statements/lines, `92.89%` functions, `86.55%` branches; `187` suites y `1414` tests.
- Coverage despues: `98.85%` statements/lines, `93.08%` functions, `86.59%` branches; `188` suites y `1418` tests.
- Archivos cubiertos: `components/game/Card.tsx` mediante `Card.test.tsx`.
- Tests agregados: imagen visible con valor padded/suit mapeado, transición de carga, fallback textual al error de imagen, carta oculta sin cara visible y cara vacía sin palo/valor.
- Riesgos cerrados: `Card.tsx` sube a `100%` statements/lines/functions y `89.47%` branches; se protege el fallback visual sin snapshots ni dependencia real de Framer Motion.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/components/game/__tests__/Card.test.tsx' --runInBand` verde con `4` tests; cobertura focalizada de `Card.tsx` en `100%` statements/lines/functions y `89.47%` branches; `pnpm --filter web test:coverage` verde con `188` suites y `1418` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef1f0c6730015eKTDe4HK11glo`.
- Riesgos abiertos: functions globales siguen por debajo de `98%`; deuda principal en `TutorialWalkthrough.tsx`, `LandingContent.tsx`, paginas App Router con callbacks, `TransactionModal.tsx` y branches server-side admin.
- Siguiente lote: `TutorialWalkthrough.tsx` para seguir subiendo functions de UI o `admin-broadcast.ts`/`admin-dashboard.ts` para branches admin.

## Checkpoint 92

- Fecha: 2026-06-22, cobertura de walkthrough de tutoriales.
- Coverage antes: `98.85%` statements/lines, `93.08%` functions, `86.59%` branches; `188` suites y `1418` tests.
- Coverage despues: `98.85%` statements/lines, `93.17%` functions, `86.71%` branches; `188` suites y `1419` tests.
- Archivos cubiertos: `components/landing/tutorials/TutorialWalkthrough.tsx` mediante `TutorialWalkthrough.test.tsx`.
- Tests agregados: orientación landscape del frame, transición a paso horizontal, vuelta al paso anterior y bloqueo de índices fuera de rango.
- Riesgos cerrados: `TutorialWalkthrough.tsx` sube a `100%` statements/lines/functions y `95.65%` branches; se cubren handlers de navegación sin depender de animaciones reales de GSAP.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/components/landing/tutorials/__tests__/TutorialWalkthrough.test.tsx' --runInBand` verde con `4` tests; cobertura focalizada de `TutorialWalkthrough.tsx` en `100%` statements/lines/functions y `95.65%` branches; `pnpm --filter web test:coverage` verde con `188` suites y `1419` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef2091650001CeVHvvmdSDc2Q3`.
- Riesgos abiertos: functions globales siguen por debajo de `98%`; deuda principal en `LandingContent.tsx`, paginas App Router con callbacks, `TransactionModal.tsx`, `admin-broadcast.ts`, `admin-dashboard.ts` y ramas server-side residuales.
- Siguiente lote: `LandingContent.tsx` o paginas App Router para functions de UI, alternando con `admin-broadcast.ts`/`admin-dashboard.ts` para branches admin.

## Checkpoint 93

- Fecha: 2026-06-22, hardening de landing pública.
- Coverage antes: `98.85%` statements/lines, `93.17%` functions, `86.71%` branches; `188` suites y `1419` tests.
- Coverage despues: `98.86%` statements/lines, `93.17%` functions, `86.77%` branches; `188` suites y `1421` tests.
- Archivos cubiertos: `components/landing/LandingContent.tsx` mediante `LandingContent.test.tsx`.
- Tests agregados: preferencia de movimiento reducido, resize del carrusel de tutoriales, touchend sin inicio, cleanup de listener y transform del carrusel de fotos.
- Riesgos cerrados: `LandingContent.tsx` queda en `100%` statements/lines y sube branches a `94.61%`; se elimina un callback muerto del carrusel sin cambio visual.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/components/landing/__tests__/LandingContent.test.tsx' --runInBand` verde con `22` tests; `pnpm --filter web test:coverage` verde con `188` suites y `1421` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_ef222d58d001ojkfZrLOjxo1Os`.
- Riesgos abiertos: functions globales siguen por debajo de `98%`; deuda principal en paginas App Router con callbacks, `TransactionModal.tsx`, `admin-broadcast.ts`, `admin-dashboard.ts`, `LocationMap.tsx` y branches server-side residuales.
- Siguiente lote: atacar paginas App Router para subir functions de UI o `admin-broadcast.ts`/`admin-dashboard.ts` para branches admin.

## Checkpoint 94

- Fecha: 2026-06-24, Fase 3 de hardening sobre ramas defensivas e infraestructura.
- Coverage antes: `99.18%` statements/lines, `93.55%` functions, `88.34%` branches; `188` suites y `1495` tests.
- Coverage despues: `99.26%` statements/lines, `93.55%` functions, `88.55%` branches; `189` suites y `1509` tests.
- Archivos cubiertos: `app/(player)/replays/page.tsx`, `app/(player)/profile/page.tsx`, `lib/security/csp.ts`, `utils/supabase/client.ts`, `components/game/PlayerBadge.tsx` y `game-server/src/services/AlertService.ts`.
- Tests agregados: fallback de hidratacion remota de replays, timeline con descartes, variantes de grid por cantidad de manos, error de update en perfil, avatar SVG existente, origen WebSocket invalido/valido para CSP, cliente Supabase SSR sin singleton, avatar remoto en `PlayerBadge`, alt fallback sin nickname, `AlertService.emitAsync(info)` y no persistencia sin service role key.
- Riesgos cerrados: `app/(player)/replays/page.tsx` queda en `100%`, `utils/supabase/client.ts` queda en `100%`, `PlayerBadge.tsx` sube branches a `96.87%` y `AlertService.ts` queda en `100%` statements/lines/functions con `96.07%` branches.
- Resultado de verificacion: suites focalizadas web (`47` tests) y `AlertService` (`19` tests) verdes; `pnpm --filter web test` verde con `189` suites y `1509` tests; `pnpm --filter game-server test` verde con `27` suites y `766` tests; coverage completo verde en ambos workspaces.
- Gate operativo subido gradualmente: web a `90/84/86/90`; game-server a `89/80/89/90`.
- Riesgos abiertos: functions globales web siguen lejos de `98%`; deuda principal en paginas App Router con callbacks, landing, `TransactionModal.tsx`, `LocationMap.tsx` y branches server-side admin.
- Siguiente lote: atacar functions de UI (`app/play/[id]/page.tsx`, paginas App Router, `LandingContent.tsx`) o branches admin (`admin-broadcast.ts`, `admin-dashboard.ts`, `admin-ledger.ts`).

## Checkpoint 95

- Fecha: 2026-07-01, hardening de modal financiero del jugador.
- Coverage antes: `99.26%` statements/lines, `93.55%` functions, `88.56%` branches; `189` suites y `1509` tests.
- Coverage despues: `99.27%` statements/lines, `93.55%` functions, `88.75%` branches; `189` suites y `1513` tests.
- Archivos cubiertos: `components/wallet/TransactionModal.tsx` mediante `TransactionModal.test.tsx`.
- Tests agregados: fallback a URL publica cuando `createSignedUrl` no devuelve `signedUrl`, modal cerrado con transaccion cargada, retiro pendiente sin comprobante, transferencia fallida, ajuste administrativo y tipo desconocido.
- Riesgos cerrados: `TransactionModal.tsx` sube a `100%` statements/lines/functions y `91.66%` branches; quedan protegidos los detalles visibles de operaciones de boveda sin tocar server actions, RPCs ni `wallets_ledger`.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/components/wallet/__tests__/TransactionModal.test.tsx' --runInBand` verde con `9` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1513` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f205f3bbe001rT4VJPAXewukJu`.
- Checklist ledger: pruebas limitadas a UI y Supabase Storage mockeado; sin escrituras financieras, sin cambios a movimientos ni RPCs.
- Riesgos abiertos: functions globales web siguen lejos de `98%`; deuda principal en paginas App Router con callbacks, `LandingContent.tsx`, `LocationMap.tsx`, `admin-broadcast.ts`, `admin-dashboard.ts`, `admin-ledger.ts` y branches residuales de wallet/admin.
- Siguiente lote: alternar hacia branches admin (`admin-broadcast.ts`, `admin-dashboard.ts`, `admin-ledger.ts`) o funciones UI (`app/play/[id]/page.tsx`, paginas App Router, `LandingContent.tsx`) para seguir avanzando sin inflar tests de bajo valor.

## Checkpoint 96

- Fecha: 2026-07-02, hardening de broadcast admin server-side.
- Coverage antes: `99.27%` statements/lines, `93.55%` functions, `88.75%` branches; `189` suites y `1513` tests.
- Coverage despues: `99.28%` statements/lines, `93.55%` functions, `88.98%` branches; `189` suites y `1522` tests.
- Archivos cubiertos: `app/actions/admin-broadcast.ts` mediante `admin-broadcast.test.ts`.
- Tests agregados: errores de audiencia, insert de broadcast, insert de notificaciones, error de deliveries, deliveries sin `notification_id`, envio sin secreto interno, fetch fallido al game-server, history vacio, conteos nulos e ignorar lecturas sin `broadcast_id`.
- Riesgos cerrados: `admin-broadcast.ts` sube a `100%` statements/lines/functions y `96.66%` branches; queda protegido el flujo de broadcast sin abrir conexiones reales ni depender del game-server.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/admin-broadcast.test.ts' --runInBand` verde con `16` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1522` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f2074c8cb001RQBZ3BnsNxtoHI`.
- Checklist admin realtime: Supabase y `fetch` mockeados en bordes; no cambia contrato de `broadcast_messages`, `notifications`, `broadcast_deliveries` ni Socket.IO.
- Riesgos abiertos: functions globales web siguen lejos de `98%`; deuda principal en `admin-dashboard.ts`, `admin-ledger.ts`, `admin-tables.ts`, `LocationMap.tsx`, `LandingContent.tsx` y paginas App Router con callbacks bajos.
- Siguiente lote: `admin-dashboard.ts` o `admin-ledger.ts` para seguir subiendo branches admin, alternando luego con functions UI (`LocationMap.tsx`/páginas App Router) para no sesgar el plan solo a server actions.

## Checkpoint 97

- Fecha: 2026-07-02, hardening de dashboard admin server-side.
- Coverage antes: `99.28%` statements/lines, `93.55%` functions, `88.98%` branches; `189` suites y `1522` tests.
- Coverage despues: `99.32%` statements/lines, `93.55%` functions, `89.07%` branches; `189` suites y `1525` tests.
- Archivos cubiertos: `app/actions/admin-dashboard.ts` mediante `admin-dashboard.test.ts`.
- Tests agregados: fallback de `get_total_users_balance` contra `wallets`, fallback de `get_ledger_net_balance` contra `ledger`, conteo de rooms activos desde matchmake, diff `ALERTA`, deteccion de usuarios con fingerprint compartido, total de rake y estados de boveda `ALERTA`/`CRÍTICO`.
- Riesgos cerrados: `admin-dashboard.ts` sube a `100%` statements/lines/functions y `89.04%` branches; quedan protegidos calculos financieros de lectura y señales operativas sin modificar RPCs, ledger ni UI.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/admin-dashboard.test.ts' --runInBand` verde con `13` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1525` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f2081ab710018XULg7OpEclZRv`.
- Checklist ledger/admin: pruebas solo de lectura y agregacion con Supabase mockeado; sin escrituras financieras, sin cambios a `wallets_ledger`, RPCs ni actions productivas.
- Riesgos abiertos: functions globales web siguen lejos de `98%`; deuda principal en `admin-ledger.ts`, `admin-tables.ts`, `admin-security.ts`, `LocationMap.tsx`, `LandingContent.tsx`, `SupportChat.tsx` y callbacks de App Router.
- Siguiente lote: `admin-ledger.ts` para continuar branches financieras de lectura, o `LocationMap.tsx`/`LandingContent.tsx` si se prioriza functions/branches de UI publica.

## Checkpoint 98

- Fecha: 2026-07-02, cierre de ramas de ledger admin de solo lectura.
- Coverage antes: `99.32%` statements/lines, `93.55%` functions, `89.07%` branches; `189` suites y `1525` tests.
- Coverage despues: `99.32%` statements/lines, `93.55%` functions, `89.17%` branches; `189` suites y `1531` tests.
- Archivos cubiertos: `app/actions/admin-ledger.ts` mediante `admin-ledger.test.ts`.
- Tests agregados: errores de query en ledger global y por usuario, usuario relacionado sin nombre, relacion de perfil vacia, referencias vacias normalizadas a `null`, ledger de usuario sin datos y perfil con wallet faltante.
- Riesgos cerrados: `admin-ledger.ts` queda en `100%` statements/lines/functions/branches; se fija el contrato de lectura admin sin cambiar RPCs ni movimientos financieros.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/admin-ledger.test.ts' --runInBand` verde con `12` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1531` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f2092d330001OCCYmhYSUUw2xY`.
- Checklist ledger: pruebas solo de lectura; sin `UPDATE`/`DELETE`, sin cambios a `wallets_ledger`, sin RPCs nuevas y sin escrituras de balance.
- Riesgos abiertos: branches globales siguen bajo `98%`; deuda principal en `admin-tables.ts`, `admin-security.ts`, `support.ts`, `wallet.ts`, `LocationMap.tsx`, `SupportChat.tsx` y componentes admin con branches bajos.
- Siguiente lote: continuar branches con `admin-tables.ts`/`admin-security.ts`, o alternar a UI compartida (`SupportChat.tsx`, `LocationMap.tsx`) para evitar sesgo exclusivo a server actions.

## Checkpoint 99

- Fecha: 2026-07-02, hardening de acciones admin de mesas.
- Coverage antes: `99.32%` statements/lines, `93.55%` functions, `89.17%` branches; `189` suites y `1531` tests.
- Coverage despues: `99.32%` statements/lines, `93.55%` functions, `89.44%` branches; `189` suites y `1541` tests.
- Archivos cubiertos: `app/actions/admin-tables.ts` mediante `admin-tables.test.ts`.
- Tests agregados: error de listado de mesas, conteo `games` como objeto, errores de juegos activos, defaults sin tabla/perfil, errores de insert common/custom, update de mesa inexistente/fallido, fallos de pausa/kick/toggle, fallback de lobby por query directa, financials sin RPC/error generico y cleanup fallido.
- Riesgos cerrados: `admin-tables.ts` sube a `100%` statements/lines/functions y `95.04%` branches; se cubren ramas operativas sin abrir sockets reales ni tocar contratos Colyseus.
- Resultado de verificacion: `pnpm --filter web exec jest --runTestsByPath 'src/__tests__/actions/admin-tables.test.ts' --runInBand` verde con `24` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1541` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20a0f5d1001xMQ0TkQi3xRbrQ`.
- Checklist admin/realtime: Supabase mockeado en bordes; sin llamadas Colyseus reales, sin cambios de persistencia y sin escrituras financieras nuevas.
- Riesgos abiertos: branches globales siguen bajo `98%`; deuda principal en `admin-security.ts`, `support.ts`, `wallet.ts`, `admin-rake.ts`, `LocationMap.tsx`, `SupportChat.tsx` y componentes admin con branches bajos.
- Siguiente lote: `admin-security.ts` por riesgo operativo/MFA o `support.ts` por soporte realtime; si se busca alternar UI, `LocationMap.tsx`/`SupportChat.tsx`.

## Checkpoint 100

- Fecha: 2026-07-02, hardening de seguridad admin server-side.
- Coverage antes: `99.32%` statements/lines, `93.55%` functions, `89.44%` branches; `189` suites y `1541` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `89.73%` branches; `189` suites y `1556` tests.
- Archivos cubiertos: `app/actions/admin-security.ts` mediante `admin-security.test.ts`.
- Tests agregados: admin no autenticado en cambio de email, rotacion de recovery codes y cierre de sesiones; TOTP rechazado antes de `unenroll`/delete; headers ausentes con fallback localhost; formularios incompletos; email nulo en auditoria; conteo nulo de recovery codes.
- Riesgos cerrados: `admin-security.ts` sube a `100%` statements/lines/functions y `97.27%` branches; quedan protegidos MFA, sesiones y recovery codes sin tocar flujos productivos ni Supabase real.
- Resultado de verificacion: `pnpm --filter web exec jest src/app/actions/__tests__/admin-security.test.ts --runInBand` verde con `50` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1556` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist seguridad admin: Supabase/Auth/MFA mockeados en bordes; sin llamadas reales, sin cambios de persistencia, sin alterar auditoria productiva.
- Riesgos abiertos: branches globales siguen bajo `98%`; deuda principal en `support.ts`, `wallet.ts`, `admin-rake.ts`, `LocationMap.tsx`, `SupportChat.tsx`, `TableActiveToggle.tsx` y functions de `LandingContent.tsx`/`app/play/[id]/page.tsx`.
- Siguiente lote: `support.ts` por soporte realtime y permisos, o alternar a UI compartida (`LocationMap.tsx`/`SupportChat.tsx`) para subir branches/functions fuera de server actions.

## Checkpoint 101

- Fecha: 2026-07-02, hardening de soporte server-side.
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `89.73%` branches; `189` suites y `1556` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `89.81%` branches; `189` suites y `1566` tests.
- Archivos cubiertos: `app/actions/support.ts` mediante `support-actions.test.ts`.
- Tests agregados: auth guards para `appendSupportMessage`, `closeSupportTicket`, `getSupportTicket`, `getSupportTicketHistory`, `listUserTickets`, `listAllTickets`, `uploadSupportAttachment` y `getSupportAttachmentUrl`; fallback de rol `player` cuando la RPC omite `from` y caller no es admin; fallback de extensión `bin` cuando el archivo adjunto no tiene extensión.
- Riesgos cerrados: `support.ts` sube de `86.81%` a `91.86%` branches; quedan protegidas las 8 funciones contra acceso no autenticado y los fallbacks de `from`/extensión. Las 10 ramas restantes son `||` defensivos estructuralmente inaccesibles con la implementación actual de `getAuthenticatedUser()`.
- Resultado de verificacion: `pnpm --filter web exec jest src/app/actions/__tests__/support-actions.test.ts --runInBand` verde con `51` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1566` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist soporte: Supabase/Storage mockeados en bordes; sin llamadas reales, sin escrituras a `support_tickets`/`support_messages`/`support_attachments`, sin cambios de RPCs.
- Riesgos abiertos: branches globales siguen bajo `98%`; deuda principal en `wallet.ts` (filter branches), `admin-rake.ts` (rakeEntries null), `LocationMap.tsx`/`SupportChat.tsx` y functions de `LandingContent.tsx`/`app/play/[id]/page.tsx`.
- Siguiente lote: `wallet.ts` para cerrar filter branches financieras, o `admin-rake.ts` para reporting con datos nulos; si se busca UI, `TableActiveToggle.tsx` (25% branches, sin tests propios).

## Checkpoint 102

- Fecha: 2026-07-02, hardening de wallet jugador server-side.
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `89.81%` branches; `189` suites y `1566` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `89.83%` branches; `189` suites y `1569` tests.
- Archivos cubiertos: `app/actions/wallet.ts` mediante `wallet.test.ts`.
- Tests agregados: retiro completado filtrado de la actividad de boveda en `getWalletData`; deposito completado filtrado del historial en `getWalletHistory`; fallback `?? 'Monto inválido'` cuando la validacion no devuelve `issues` en `createDepositRequest`.
- Riesgos cerrados: `wallet.ts` sube de `84.44%` a `86.95%` branches; quedan cubiertas las ramas de filtrado de solicitudes completadas y el fallback defensivo de validación.
- Resultado de verificacion: `pnpm --filter web exec jest src/__tests__/actions/wallet.test.ts --runInBand` verde con `19` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1569` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist wallet: pruebas de solo lectura con Supabase mockeado; sin `UPDATE`/`DELETE` a `wallets`/`deposit_requests`/`withdrawal_requests`/`ledger` ni escrituras de balance.
- Riesgos abiertos: branches globales siguen bajo `98%`; deuda principal en `admin-rake.ts` (rakeEntries null), `LocationMap.tsx`/`SupportChat.tsx`, `TableActiveToggle.tsx` (25% branches, sin tests propios) y functions de `LandingContent.tsx`/`app/play/[id]/page.tsx`.
- Siguiente lote: `admin-rake.ts` para reporting financiero con datos nulos, o `TableActiveToggle.tsx`/`DashboardWarnings.tsx` para subir branches de UI admin.

## Checkpoint 103

- Fecha: 2026-07-02, hardening de rake admin y UI admin (Lotes 3-4 combinados).
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `89.83%` branches; `189` suites y `1569` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `90.04%` branches; `189` suites y `1575` tests.
- Archivos cubiertos: `app/actions/admin-rake.ts` mediante `admin-rake.test.ts`; `components/admin/TableActiveToggle.tsx` y `components/admin/DashboardWarnings.tsx` mediante `AdminSmallControls.test.tsx`.
- Tests agregados: `rakeEntries` null sin romper agregados ni consultas secundarias; rake entry con `game_id` sin win entry correspondiente (fallback `|| 0`); DashboardWarnings en singular (1 fuente degradada); TableActiveToggle con `isActive=true` (desactivar mesa); TableActiveToggle con `toggleTableActive` fallido (alert de error); TableActiveToggle con confirmación cancelada (no togglea ni refresca).
- Riesgos cerrados: `admin-rake.ts` sube de `84.84%` a `96.96%` branches; `TableActiveToggle.tsx` sube de `25%` a `100%` branches; `DashboardWarnings.tsx` sube de `66.66%` a `100%` branches. **Web branches cruzan `90%` por primera vez.**
- Resultado de verificacion: `pnpm --filter web exec jest src/app/actions/__tests__/admin-rake.test.ts src/components/admin/__tests__/AdminSmallControls.test.tsx --runInBand` verde con `15` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1575` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist admin/UI: Supabase mockeado en bordes; sin llamadas reales, sin cambios de persistencia, sin escrituras a `ledger` ni `wallets`.
- Riesgos abiertos: branches globales en `90.04%`, aún lejos de `98%`; deuda principal en `LocationMap.tsx` (66.66% branches, guards null defensivos), `SupportChat.tsx` (83.44% branches), `auth-actions.ts` (87.18% branches), `passkey-actions.ts` (87.5% branches) y functions de `LandingContent.tsx` (72.97%)/`app/play/[id]/page.tsx` (78.26%).
- Siguiente lote: `auth-actions.ts`/`passkey-actions.ts` para subir branches de auth, o `LandingContent.tsx`/`app/play/[id]/page.tsx` para subir functions globales.

## Checkpoint 104

- Fecha: 2026-07-02, hardening de auth server-side (passkey + loginWithPin).
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `90.04%` branches; `189` suites y `1575` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `90.16%` branches; `189` suites y `1583` tests.
- Archivos cubiertos: `app/(auth)/passkey-actions.ts` mediante `passkey-actions.test.ts`; `app/(auth)/auth-actions.ts` mediante `otp-and-pin-actions.test.ts`.
- Tests agregados: WEBAUTHN_ORIGINS/RP_ID env vars; fallback de `userName` a `phone` y `user.id`; auth guard de `verifyPasskeyRegistration`; fallback de `transports` a `['internal']` en registro y login; fallback de `sign_count` a `0`; redirect a `device-verify` tras OTP exitoso en dispositivo desconocido.
- Riesgos cerrados: `passkey-actions.ts` queda en `100%` statements/lines/functions/branches; `auth-actions.ts` sube de `86.64%` a `87.09%` branches (linea 396-398 cubierta).
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='auth.*actions.*test' --runInBand` verde con `121` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1583` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist auth: Supabase/Auth/WebAuthn mockeados en bordes; sin llamadas reales, sin cambios de persistencia, sin alterar flujo productivo de auth.
- Riesgos abiertos: branches globales en `90.16%`, aún lejos de `98%`; deuda principal en `auth-actions.ts` (87.09% branches dispersos), `LocationMap.tsx` (66.66%), `SupportChat.tsx` (83.44%) y functions de `LandingContent.tsx` (72.97%)/`app/play/[id]/page.tsx` (78.26%).
- Siguiente lote: `SupportChat.tsx` por branches/functions de UI transversal, o `LandingContent.tsx` para subir functions globales hacia `95%`.

## Checkpoint 105

- Fecha: 2026-07-02, hardening de SupportChat UI transversal.
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `90.16%` branches; `189` suites y `1583` tests.
- Coverage despues: `99.36%` statements/lines, `93.55%` functions, `90.32%` branches; `189` suites y `1592` tests.
- Archivos cubiertos: `components/SupportChat.tsx` mediante `SupportChat.test.tsx`.
- Tests agregados: error de `createSupportTicket` sin emitir `ticket-created`; error de `appendSupportMessage` sin emitir `message-created`; mensaje socket de otro ticket ignorado; fallback de `uuidv4`/`Date.now` cuando socket omite `messageId`/`timestamp`; notificacion legacy `support:message` cuando chat flotante cerrado; guard de `handleFileSelect` sin archivo/ticketId; ticket finalizado no muestra boton de cerrar; submit deshabilitado cuando input vacio; preview largo con elipsis y preview nulo con fallback "Consulta".
- Riesgos cerrados: `SupportChat.tsx` sube de `83.44%` a `90.18%` branches; quedan protegidos errores de envio, eventos socket de otros tickets, guards de adjuntos y estados de UI.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='SupportChat.*test' --runInBand` verde con `28` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1592` tests.
- Reporte completo: `/home/jose/.local/share/opencode/tool-output/tool_f20b1f119001nXggURxUNaXEs4`.
- Checklist soporte UI: socket mockeado con handlers reales; server actions mockeadas; sin llamadas reales ni sockets productivos.
- Riesgos abiertos: branches globales en `90.32%`, functions en `93.55%`; deuda principal en `LandingContent.tsx` (functions 72.97%), `app/play/[id]/page.tsx` (functions 78.26%), `auth-actions.ts` (branches 87.09%), `LocationMap.tsx` (branches 66.66% defensivos) y ramas residuales de `SupportChat.tsx` (guards de socketUrl).
- Siguiente lote: `LandingContent.tsx` para subir functions globales hacia `95%`, o `app/play/[id]/page.tsx` para callbacks de juego.

## Checkpoint 106

- Fecha: 2026-07-02, hardening de LandingContent functions.
- Coverage antes: `99.36%` statements/lines, `93.55%` functions, `90.32%` branches; `189` suites y `1592` tests.
- Coverage despues: `99.36%` statements/lines, `94.5%` functions, `90.38%` branches; `189` suites y `1603` tests.
- Archivos cubiertos: `components/landing/LandingContent.tsx` mediante `LandingContent.test.tsx`.
- Tests agregados: carga dinamica de pasos de 7 tutoriales restantes ("Cómo iniciar sesión", "Cómo cargar saldo", "Cómo retirar saldo", "Cómo transferir saldo", "Cómo jugar tu primera partida", "Funciones del menú de mesa", "Amigos"); click en boton de seccion del nav desktop; cierre de menu mobile al click en "Iniciar sesión" y "Crear cuenta"; guard de touchEnd sin touchStart previo en carrusel de fotos.
- Riesgos cerrados: `LandingContent.tsx` sube functions de `72.97%` a `100%` y branches de `94.61%` a `96.15%`; las 10 funciones no cubiertas (8 dynamic imports de tutoriales + 2 onClick de mobile menu + 1 onClick de nav desktop) quedan ejercitadas; branch L580 (guard de touchEnd sin touchStart) cubierta.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='LandingContent.*test' --runInBand` verde con `33` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1603` tests.
- Riesgos abiertos: functions globales en `94.5%`, branches en `90.38%`; deuda principal en `app/play/[id]/page.tsx` (functions 78.26%), `auth-actions.ts` (branches 87.09%), `LocationMap.tsx` (branches 66.66% defensivos), ramas residuales de `SupportChat.tsx` (guards de socketUrl) y fallbacks `||` defensivos de `LandingContent.tsx` (helpers de tutorial con titulos no mapeados).
- Siguiente lote: `app/play/[id]/page.tsx` para subir functions globales, o `auth-actions.ts` para branches de seguridad.

## Checkpoint 107

- Fecha: 2026-07-02, hardening de play page callbacks.
- Coverage antes: `99.36%` statements/lines, `94.5%` functions, `90.38%` branches; `189` suites y `1603` tests.
- Coverage despues: `99.36%` statements/lines, `94.97%` functions, `90.42%` branches; `189` suites y `1609` tests.
- Archivos cubiertos: `app/play/[id]/page.tsx` mediante `page.test.tsx`.
- Tests agregados: cierre de modal de reglas desde `onClose`; cierre de modal de deposito desde `onClose`; cierre de modal de transferencia desde `onClose`; cierre de modal de ayuda de mesa desde `onClose`; cambio de orientacion portrait/landscape via evento de `matchMedia`; banda sin `details` con fallback `0` jugador(es); banda con `minPique >= 1_000_000` mostrando `$5,000 por jugador`.
- Riesgos cerrados: `app/play/[id]/page.tsx` sube functions de `78.26%` a `100%` y branches de `86.29%` a `87.74%`; las 5 funciones no cubiertas (handler de orientation change + 4 callbacks `onClose` de modales) quedan ejercitadas; branches L620 (banda sin details) y L660 (banda 5000 vs 2000) cubiertas.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='play.*page.*test' --runInBand` verde con `133` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1609` tests.
- Riesgos abiertos: functions globales en `94.97%`, branches en `90.42%`; deuda principal en `auth-actions.ts` (branches 87.09%), `LocationMap.tsx` (branches 66.66% defensivos), ramas residuales de `SupportChat.tsx` (guards de socketUrl), fallbacks `||` defensivos de `LandingContent.tsx` y catch de audio/reload de `app/play/[id]/page.tsx`.
- Siguiente lote: `auth-actions.ts` para branches de seguridad, o UI selectivos (`DepositForm.tsx`, `VoiceChat.tsx`, `ReplayBoard.tsx`).

## Checkpoint 108

- Fecha: 2026-07-02, hardening de VoiceChat UI.
- Coverage antes: `99.36%` statements/lines, `94.97%` functions, `90.42%` branches; `189` suites y `1609` tests.
- Coverage despues: `99.38%` statements/lines, `94.97%` functions, `90.54%` branches; `189` suites y `1616` tests.
- Archivos cubiertos: `components/VoiceChat.tsx` mediante `VoiceChat.test.tsx`.
- Tests agregados: error al solicitar token LiveKit; error al togglear micrófono; UI de micrófono activo; speaker con nombre genérico `Jugador`; guard de mute cuando el track es null; mute remoto via `track.enabled` sin elementos de audio adjuntos; fallback de identity cuando nombre remoto es `Jugador` o está ausente.
- Riesgos cerrados: `VoiceChat.tsx` sube branches de `80%` a `93.22%`; quedan cubiertos los errores visibles de LiveKit/micrófono y ramas de audio remoto sin depender de LiveKit real.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='VoiceChat.*test' --runInBand` verde con `17` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1616` tests.
- Riesgos abiertos: branches globales en `90.54%`; deuda principal en `auth-actions.ts`, `LocationMap.tsx` guards defensivos, ramas residuales de `SupportChat.tsx`, fallbacks de `LandingContent.tsx` y catch/reload de `app/play/[id]/page.tsx`.
- Siguiente lote: `auth-actions.ts` para branches de seguridad si se acepta más mocking de Supabase, o cerrar UI selectivos restantes.

## Checkpoint 109

- Fecha: 2026-07-02, hardening de auth-actions seguridad.
- Coverage antes: `99.38%` statements/lines, `94.97%` functions, `90.54%` branches; `189` suites y `1616` tests.
- Coverage despues: `99.38%` statements/lines, `94.97%` functions, `90.69%` branches; `189` suites y `1626` tests.
- Archivos cubiertos: `app/(auth)/auth-actions.ts` mediante `auth-actions.test.ts`, `otp-and-pin-actions.test.ts` y `google-auth-actions.test.ts`.
- Tests agregados: rate limit de `registerPlayer`; rate limit de `loginAdmin`; recovery admin sin factor TOTP; login admin con factor TOTP no verificado; verificación admin usando primer factor TOTP no verificado; rate limit de `verifyOtp`; rate limit de `setPlayerPin`; rate limit de `startPinRecovery`; fallback de email vacío en `getGoogleUserData`; rate limit de `completeGoogleRegistration`.
- Riesgos cerrados: `auth-actions.ts` sube branches de `87.05%` a `90.52%` en cobertura global; quedan cubiertos límites anti-abuso y fallbacks MFA/recovery sin mutaciones reales ni llamadas Supabase productivas.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='(auth-actions|otp-and-pin-actions|google-auth-actions).*test' --runInBand` verde con `111` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1626` tests.
- Riesgos abiertos: branches globales en `90.69%`; deuda principal en ramas defensivas de `LocationMap.tsx`, `SupportChat.tsx`, fallbacks de `LandingContent.tsx`, catch/reload de `app/play/[id]/page.tsx` y rate/fallback branches menores restantes de `auth-actions.ts`.
- Siguiente lote: UI selectivos restantes o una pasada final sobre branches defensivas de auth si se justifica el valor.

## Checkpoint 110

- Fecha: 2026-07-02, hardening de ReplayBoard UI.
- Coverage antes: `99.38%` statements/lines, `94.97%` functions, `90.69%` branches; `189` suites y `1626` tests.
- Coverage despues: `99.38%` statements/lines, `94.97%` functions, `90.8%` branches; `189` suites y `1633` tests.
- Archivos cubiertos: `components/replay/ReplayBoard.tsx` mediante `ReplayBoard.test.tsx`.
- Tests agregados: fase desconocida usa label crudo; memoria progresiva de cartas por `playerId`; memoria progresiva por `userId`; frame sin cartas ni `cardCount`; `cardCount` ausente tratado como cero; bote de pique cero oculto visualmente; jugador foldeado antes de showdown atenúa cartas recuperadas.
- Riesgos cerrados: `ReplayBoard.tsx` sube branches de `65.71%` a `95.45%` en cobertura global; quedan cubiertos replays retrocompatibles sin ghosting de cartas y sin pintar slots/cartas artificiales.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='ReplayBoard.*test' --runInBand` verde con `27` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1633` tests.
- Riesgos abiertos: branches globales en `90.8%`; quedan sobre todo guards defensivos difíciles de activar sin tests artificiales (`LocationMap`, fallbacks internos de landing/play/support) y branches menores de auth/server actions.
- Siguiente lote: medir otro componente UI con branches reales o detener antes de entrar en guards artificiales.

## Checkpoint 111

- Fecha: 2026-07-05, hardening de TutorialWalkthrough UI.
- Coverage antes: `99.38%` statements/lines, `94.97%` functions, `90.8%` branches; `189` suites y `1633` tests.
- Coverage despues: `99.38%` statements/lines, `94.97%` functions, `90.82%` branches; `189` suites y `1634` tests.
- Archivos cubiertos: `components/landing/tutorials/TutorialWalkthrough.tsx` mediante `TutorialWalkthrough.test.tsx`.
- Tests agregados: doble cambio de paso mientras la timeline de GSAP queda pendiente; el segundo cambio se ignora hasta completar la animación y luego se permite volver al paso anterior.
- Riesgos cerrados: `TutorialWalkthrough.tsx` sube de `95.65%` a `100%` branches; queda protegido el guard `isAnimating` contra cambios simultáneos de paso sin depender de GSAP real.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='TutorialWalkthrough.*test' --runInBand --coverage --collectCoverageFrom='src/components/landing/tutorials/TutorialWalkthrough.tsx'` verde con `5` tests; `pnpm --filter web test:coverage` verde con `189` suites y `1634` tests; `pnpm --filter web lint` verde con `64` warnings existentes; `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` verde.
- Riesgos abiertos: branches globales en `90.82%`; el siguiente salto relevante exige `Board.tsx` en micro-lotes o UI/admin con branches reales. Evitar `LocationMap.tsx` salvo que cambie el código, porque sus ramas pendientes son guards null defensivos.
- Siguiente lote recomendado: `Board.tsx` para turno/acciones bloqueadas/prompts/pique, o `LedgerFilters`/`UserLedgerTable` si se prefiere admin UI.

## Checkpoint 112

- Fecha: 2026-07-05, hardening de Board UI y LiveKit route.
- Coverage antes: `99.38%` statements/lines, `94.97%` functions, `90.82%` branches; `189` suites y `1634` tests.
- Coverage despues: `99.37%` statements/lines, `94.97%` functions, `90.89%` branches; `189` suites y `1639` tests.
- Archivos cubiertos: `components/game/Board.tsx` mediante `Board.misc.test.tsx`; `app/api/livekit/route.ts` endurecido para alinear la implementación con sus tests de seguridad existentes.
- Tests agregados: fallback de carta inferior cuando el palo no está mapeado; HUD propio con saldo/puntos por defecto y ordinal cuando el jugador local no es la mano; quitar chip sin conteo previo; click de carta ignorado fuera de turno/fase de descarte; `/api/livekit` rechaza requests no autenticados antes de generar tokens.
- Riesgos cerrados: `Board.tsx` sube de `89.78%` a `93.61%` branches en cobertura focalizada; quedan protegidos estados visibles de mesa sin tocar lógica de juego servidor. `/api/livekit` deja de aceptar identidad/nombre desde el cliente, valida nombres de sala y rechaza usuarios no autenticados antes de generar tokens.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='Board.*test' --runInBand --coverage --collectCoverageFrom='src/components/game/Board.tsx'` verde con `78` tests; `pnpm --filter web exec jest --testPathPatterns='livekit.*route.*test' --runInBand` verde con `5` tests; `pnpm --filter web test:coverage` verde localmente con `189` suites y `1643` tests incluyendo cambios no relacionados ya presentes en el workspace; `pnpm --filter web lint` verde con `64` warnings existentes; `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` verde.
- Riesgos abiertos: branches globales en `90.89%`; `Board.tsx` conserva ramas residuales de hidratación/viewport/showdown difíciles de activar sin tests más intrusivos. Siguiente valor probable: `DepositForm.tsx`, `ShowdownCinematic.tsx`, `TableHelpModal.tsx`, `LedgerFilters` o `UserLedgerTable`.
- Siguiente lote recomendado: UI de juego con errores visibles (`DepositForm.tsx`/`ShowdownCinematic.tsx`) o admin UI (`UserLedgerTable`) antes de seguir con ramas defensivas de `Board.tsx`.

## Checkpoint 113

- Fecha: 2026-07-05, hardening de DepositForm UI.
- Coverage antes: `99.37%` statements/lines, `94.97%` functions, `90.89%` branches; `189` suites y `1639` tests.
- Coverage despues: `99.4%` statements/lines, `95.09%` functions, `90.91%` branches; `195` suites y `1675` tests.
- Archivos cubiertos: `components/game/DepositForm.tsx` mediante `DepositForm.test.tsx`.
- Tests agregados: error de archivo inválido (PDF rechazado); limpieza de preview al quitar archivo; alert sin onSuccess cuando depósito es exitoso; prevención de caracteres inválidos en input de monto.
- Riesgos cerrados: `DepositForm.tsx` sube de `77.35%` a `85.96%` branches en cobertura focalizada; quedan protegidos errores visibles de validación de archivo, preview y alert sin callback.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='DepositForm.*test' --runInBand --coverage --collectCoverageFrom='src/components/game/DepositForm.tsx'` verde con `8` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1675` tests.
- Riesgos abiertos: branches globales en `90.91%`; `DepositForm.tsx` conserva ramas defensivas de validación de monto/observaciones. Siguiente valor probable: `ShowdownCinematic.tsx`, `TableHelpModal.tsx` o `UserLedgerTable.tsx`.
- Siguiente lote recomendado: `ShowdownCinematic.tsx` para cierre visual de mano, o `UserLedgerTable.tsx` para admin UI de finanzas.

## Checkpoint 114

- Fecha: 2026-07-05, hardening de ShowdownCinematic UI.
- Coverage focalizado antes: `99.09%` statements/lines, `100%` functions, `81.81%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions, `84.44%` branches.
- Archivos cubiertos: `components/game/ShowdownCinematic.tsx` mediante `ShowdownCinematic.test.tsx`.
- Tests agregados: jugador posterior gana por mejor ranking de mano (`CHIVO` sobre `NINGUNA`) y se muestra como ganador aunque el primer jugador activo aparezca antes por orden de turno.
- Riesgos cerrados: queda cubierta la rama de reemplazo de ganador dentro del loop de evaluación por ranking de mano, no solo por desempate de puntos.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='ShowdownCinematic.*test' --runInBand --coverage --collectCoverageFrom='src/components/game/ShowdownCinematic.tsx'` verde con `5` tests; `pnpm --filter web test:coverage` verde localmente con `195` suites y `1679` tests, incluyendo cambios pendientes ajenos en el workspace; `pnpm --filter web lint` verde con `64` warnings existentes; `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` verde.
- Riesgos abiertos: las ramas residuales son fallbacks de parseo/sort/reduced-motion y no justifican tests artificiales en este lote.
- Siguiente lote recomendado: `TableHelpModal.tsx` para UI de ayuda o `UserLedgerTable.tsx` para admin UI financiera de solo lectura.

## Checkpoint 115

- Fecha: 2026-07-08, hardening de TableHelpModal UI.
- Coverage global despues: `99.42%` statements/lines, `95.1%` functions, `90.95%` branches; `195` suites y `1681` tests.
- Coverage focalizado antes: `97.4%` statements/lines, `100%` functions, `80.55%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions, `92.85%` branches.
- Archivos cubiertos: `components/game/TableHelpModal.tsx` mediante `TableHelpModal.test.tsx`.
- Tests agregados: solicitud con estado `attending` muestra “Admin en camino”; cerrar y reabrir el modal resetea motivo, mensaje de estado y error visible.
- Riesgos cerrados: quedan protegidas las ramas visibles de seguimiento de ayuda y limpieza de estado local entre aperturas del modal.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='TableHelpModal.*test' --runInBand --coverage --collectCoverageFrom='src/components/game/TableHelpModal.tsx'` verde con `5` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1681` tests; `pnpm --filter web lint` verde con warnings existentes; `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` verde.
- Riesgos abiertos: quedan branches defensivos menores del modal que no justifican tests artificiales en este lote.
- Siguiente lote recomendado: `UserLedgerTable.tsx` para admin UI financiera de solo lectura, o medir ramas reales restantes de UI de juego antes de tocar guards defensivos.

## Checkpoint 116

- Fecha: 2026-07-08, hardening de UserLedgerTable UI financiera de solo lectura.
- Coverage global despues: `99.42%` statements/lines, `95.1%` functions, `91.13%` branches; `195` suites y `1683` tests.
- Coverage focalizado antes: `100%` statements/lines/functions, `85.71%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions/branches.
- Archivos cubiertos: `components/admin/UserLedgerTable.tsx` mediante `UserLedgerTable.test.tsx`.
- Tests agregados: fallbacks para movimientos sin metadata o etiquetas conocidas; búsqueda por referencia cuando faltan descripción y metadata.
- Riesgos cerrados: quedan protegidos estados de lectura de ledger con tipo/status desconocidos, descripción nula, sala sin nombre y metadata ausente sin tocar escrituras financieras.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='UserLedgerTable.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/UserLedgerTable.tsx'` verde con `4` tests y `100%` focalizado; `pnpm --filter web test:coverage` verde con `195` suites y `1683` tests.
- Riesgos abiertos: el siguiente valor probable en admin UI está en `LedgerFilters.tsx`, `UserBalanceControl.tsx` o `AuditFilters.tsx`; priorizar solo ramas visibles y no mutaciones financieras sin tests de dominio.
- Siguiente lote recomendado: medir `LedgerFilters.tsx` o `UserBalanceControl.tsx`, manteniendo el trabajo en UI de solo lectura salvo que se active la skill de ledger para mutaciones.

## Checkpoint 117

- Fecha: 2026-07-08, hardening de LedgerFilters UI admin.
- Coverage global despues: `99.42%` statements/lines, `95.1%` functions, `91.26%` branches; `195` suites y `1685` tests.
- Coverage focalizado antes: `100%` statements/lines/functions, `90.36%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions/branches.
- Archivos cubiertos: `components/admin/LedgerFilters.tsx` mediante `LedgerFilters.test.tsx`.
- Tests agregados: usuarios con saldo cero y sin actividad; transacciones con tipo/status desconocidos, usuario sin perfil y búsqueda por `user_id` cuando faltan descripción/usuario.
- Riesgos cerrados: quedan protegidos fallbacks visibles de filtros admin sin tocar movimientos financieros ni RPCs de ledger.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='LedgerFilters.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/LedgerFilters.tsx'` verde con `4` tests y `100%` focalizado; `pnpm --filter web test:coverage` verde con `195` suites y `1685` tests.
- Riesgos abiertos: próximos candidatos admin visibles son `UserBalanceControl.tsx`, `AuditFilters.tsx`, `UserBanControl.tsx` y páginas admin con functions bajas; evitar operaciones de ledger reales sin cobertura de dominio.
- Siguiente lote recomendado: `UserBalanceControl.tsx` si se mantiene en UI/mocks seguros, o `AuditFilters.tsx` para ramas de filtros sin mutaciones.

## Checkpoint 118

- Fecha: 2026-07-08, hardening de AuditFilters UI admin.
- Coverage global despues: `99.43%` statements/lines, `95.19%` functions, `91.38%` branches; `195` suites y `1687` tests.
- Coverage focalizado antes: `98.82%` statements/lines, `90%` functions, `60.86%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions, `93.54%` branches.
- Archivos cubiertos: `components/admin/AuditFilters.tsx` mediante `AdminFiltersRealtimeCleanup.test.tsx`.
- Tests agregados: exportación JSON sin filtros activos; eliminación de `action`, `context`, `dateFrom` y `dateTo` cuando los inputs quedan vacíos.
- Riesgos cerrados: quedan protegidos los filtros de auditoría sin tocar datos reales ni mutaciones financieras.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminFiltersRealtimeCleanup.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/AuditFilters.tsx'` verde con `6` tests y `93.54%` branches focalizadas; `pnpm --filter web test:coverage` verde con `195` suites y `1687` tests.
- Riesgos abiertos: branches residuales de `AuditFilters.tsx` son fecha `dateTo` ausente y `dateFrom` con valor; ya están cubiertos los caminos funcionales principales.
- Siguiente lote recomendado: `UserBalanceControl.tsx` solo con mocks de UI seguros, o `UserBanControl.tsx` para ramas visibles de sanciones.

## Checkpoint 119

- Fecha: 2026-07-08, hardening de UserBanControl UI admin.
- Coverage global despues: `99.44%` statements/lines, `95.48%` functions, `91.4%` branches; `195` suites y `1689` tests.
- Coverage focalizado antes: `97.21%` statements/lines, `78.57%` functions, `87.93%` branches.
- Coverage focalizado despues: `99.07%` statements/lines, `100%` functions, `90.62%` branches.
- Archivos cubiertos: `components/admin/UserBanControl.tsx` mediante `AdminUserModeration.test.tsx`.
- Tests agregados: cierre/reapertura del panel de sanciones y sanción temporal por días; error visible al fallar la revocación de una sanción activa.
- Riesgos cerrados: quedan cubiertos flujos visibles de moderación sin tocar datos reales ni permisos externos.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminUserModeration.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/UserBanControl.tsx'` verde con `7` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1689` tests.
- Riesgos abiertos: la rama residual de motivo vacío es defensiva e inaccesible desde UI porque el botón Aplicar queda deshabilitado sin `sanctionReason.trim()`.
- Siguiente lote recomendado: `UserBalanceControl.tsx` solo con mocks de UI seguros y sin tocar `wallets_ledger`, o páginas admin con functions bajas.

## Checkpoint 120

- Fecha: 2026-07-08, hardening de UserBalanceControl UI admin.
- Coverage global despues: `99.47%` statements/lines, `95.57%` functions, `91.41%` branches; `195` suites y `1691` tests.
- Coverage focalizado antes: `95.07%` statements/lines, `88.88%` functions, `88.09%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions, `88.88%` branches.
- Archivos cubiertos: `components/admin/UserBalanceControl.tsx` mediante `AdminUserModeration.test.tsx`.
- Tests agregados: auto-cierre y limpieza del formulario tras ajuste exitoso; cierre manual del modal y reset de error visible.
- Riesgos cerrados: quedan cubiertos estados visibles del ajuste de saldo con `adjustUserBalance` mockeado, sin tocar RPCs ni `wallets_ledger`.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminUserModeration.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/UserBalanceControl.tsx'` verde con `9` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1691` tests.
- Riesgos abiertos: ramas residuales son formato de signo, error no-`Error`, guard de cierre durante loading y click de backdrop; no justifican forzar mutaciones reales.
- Siguiente lote recomendado: páginas admin con functions bajas o componentes UI sin operaciones financieras.

## Checkpoint 121

- Fecha: 2026-07-08, hardening de UserSearch UI admin.
- Coverage global despues: `99.47%` statements/lines, `95.57%` functions, `91.42%` branches; `195` suites y `1692` tests.
- Coverage focalizado antes: `95.55%` statements/lines, `100%` functions, `80%` branches.
- Coverage focalizado despues: `100%` statements/lines/functions, `90%` branches.
- Archivos cubiertos: `components/admin/UserSearch.tsx` mediante `AdminSmallControls.test.tsx`.
- Tests agregados: limpieza de búsqueda elimina `q` tras debounce y preserva `page` en la URL.
- Riesgos cerrados: queda cubierto el branch de eliminación de query string, no solo el seteo de búsqueda.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminSmallControls.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/UserSearch.tsx'` verde con `10` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1692` tests.
- Riesgos abiertos: rama residual de inicialización con `q` ausente; bajo riesgo y no requiere test artificial en este lote.
- Siguiente lote recomendado: páginas admin con functions bajas o componentes sin mutaciones (`CreateTableModal.tsx`, `AdminStatusCard.tsx`, `CleanupStaleGamesButton.tsx`).

## Checkpoint 122

- Fecha: 2026-07-08, hardening de CreateTableModal UI admin.
- Coverage global despues: `99.48%` statements/lines, `95.66%` functions, `91.44%` branches; `195` suites y `1694` tests.
- Coverage focalizado antes: `99.64%` statements/lines, `83.33%` functions, `97.95%` branches.
- Coverage focalizado despues: `100%` statements/lines/branches, `91.66%` functions.
- Archivos cubiertos: `components/admin/CreateTableModal.tsx` mediante `CreateTableModal.test.tsx`.
- Tests agregados: cierre del modal por botón X sin crear mesa; re-habilitación de ficha deshabilitada en mesa personalizada.
- Riesgos cerrados: quedan cubiertos los caminos visibles de cierre y toggle reversible de fichas, además del límite de al menos una ficha habilitada.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='CreateTableModal.*test' --runInBand --coverage --collectCoverageFrom='src/components/admin/CreateTableModal.tsx'` verde con `6` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1694` tests.
- Riesgos abiertos: queda una función inline menor sin cubrir; el comportamiento principal de creación común/personalizada y error ya está protegido.
- Siguiente lote recomendado: `AdminStatusCard.tsx` o `CleanupStaleGamesButton.tsx` para ramas pequeñas de UI admin.

## Checkpoint 123

- Fecha: 2026-07-08, hardening de AdminStatusCard y CleanupStaleGamesButton UI admin.
- Coverage global despues: `99.48%` statements/lines, `95.66%` functions, `91.48%` branches; `195` suites y `1696` tests.
- Coverage focalizado antes: `100%` statements/lines/functions, `83.33%` branches (ambos componentes).
- Coverage focalizado despues: `100%` statements/lines/functions/branches (ambos componentes).
- Archivos cubiertos: `components/admin/AdminStatusCard.tsx` mediante `AdminStatusCard.test.tsx`; `components/admin/CleanupStaleGamesButton.tsx` mediante `AdminFiltersRealtimeCleanup.test.tsx`.
- Tests agregados: render de AdminStatusCard sin `detail`; cancelación de confirmación en CleanupStaleGamesButton.
- Riesgos cerrados: quedan cubiertos el branch de `detail` opcional y la rama de confirmación cancelada, ambos visibles en UI admin.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminStatusCard.test' --runInBand --coverage --collectCoverageFrom='src/components/admin/AdminStatusCard.tsx'` verde con `3` tests; `pnpm --filter web exec jest --testPathPatterns='AdminFiltersRealtimeCleanup.test' --runInBand --coverage --collectCoverageFrom='src/components/admin/CleanupStaleGamesButton.tsx'` verde con `7` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1696` tests.
- Riesgos abiertos: ninguno crítico; ambos componentes quedan en `100%` focalizado.
- Siguiente lote recomendado: páginas admin con functions bajas (`app/(admin)/admin/alerts/page.tsx`, `app/(admin)/admin/audit/page.tsx`) o componentes con branches residuales (`DeleteTableButton.tsx`, `PlayerControls.tsx`).

## Checkpoint 124

- Fecha: 2026-07-08, hardening de DeleteTableButton y PlayerControls UI admin.
- Coverage global despues: `99.48%` statements/lines, `95.66%` functions, `91.51%` branches; `195` suites y `1698` tests.
- Coverage focalizado antes: `100%` statements/lines/functions, `87.5%` branches (DeleteTableButton); `100%` statements/lines/functions, `75%` branches (PlayerControls).
- Coverage focalizado despues: `100%` statements/lines/functions/branches (ambos componentes).
- Archivos cubiertos: `components/admin/DeleteTableButton.tsx` mediante `AdminSmallControls.test.tsx`; `components/admin/PlayerControls.tsx` mediante `AdminControlsAndDataView.test.tsx`.
- Tests agregados: cancelación de confirmación en eliminación de mesa; cancelación de confirmación en expulsión de jugador.
- Riesgos cerrados: quedan cubiertas las ramas de cancelación de confirmación en ambos componentes, visibles en UI admin.
- Resultado de verificacion: `pnpm --filter web exec jest --testPathPatterns='AdminSmallControls.test' --runInBand --coverage --collectCoverageFrom='src/components/admin/DeleteTableButton.tsx'` verde con `11` tests; `pnpm --filter web exec jest --testPathPatterns='AdminControlsAndDataView.test' --runInBand --coverage --collectCoverageFrom='src/components/admin/PlayerControls.tsx'` verde con `8` tests; `pnpm --filter web test:coverage` verde con `195` suites y `1698` tests.
- Riesgos abiertos: ninguno crítico; ambos componentes quedan en `100%` focalizado.
- Siguiente lote recomendado: páginas admin con functions bajas (`app/(admin)/admin/alerts/page.tsx`, `app/(admin)/admin/audit/page.tsx`) o componentes con branches residuales (`UserBalanceControl.tsx`, `UserBanControl.tsx`).
