# Roadmap de Cobertura Web

## Objetivo del Documento

Este documento define el estado actual de cobertura de `apps/web`, el objetivo deseado, la estrategia de ejecucion, la forma de dividir el trabajo y los checklists de verificacion para avanzar de manera sostenible hacia una cobertura global de alta confianza.

No es un documento aspiracional generico. Es una hoja de ruta operativa para que el equipo pueda tomar el trabajo por fases, medir avance real y evitar inflar coverage con pruebas de poco valor.

## Estado Actual Medido

Fecha de referencia: medicion ejecutada localmente sobre `apps/web` con `pnpm --filter web test:coverage`.

Cobertura actual de `apps/web`:

| Metrica | Valor actual |
|---|---:|
| Statements | `19.06%` |
| Lines | `19.06%` |
| Functions | `39.03%` |
| Branches | `63.28%` |

Resultado de la corrida:

- `58` suites en verde.
- `504` tests pasando.
- La suite actual es funcionalmente util, pero la cobertura es baja porque ahora se mide mucha superficie UI que antes no entraba al reporte.

## Meta Final

Objetivo estrategico de largo plazo:

- `98%` global en `statements`, `lines`, `functions` y `branches` para `apps/web`.

Objetivo de calidad asociado:

- No degradar la calidad de aserciones.
- No maquillar coverage con snapshots vacios o asserts triviales.
- Cubrir caminos reales de negocio, errores de red, estados de carga, render condicional y side effects.

## Realidad del Gap

Pasar de `19.06%` a `98%` en la web no es un ajuste menor ni un sprint corto. La web incluye:

- App Router de Next.js.
- formularios publicos de auth;
- landing altamente interactiva;
- dashboard y wallet del jugador;
- componentes de juego en tiempo real;
- panel admin;
- wrappers y providers;
- integraciones con Supabase, Turnstile, WebAuthn, sockets y PWA.

Por tanto, la meta debe abordarse como un programa de trabajo por etapas, no como una unica tarea de testing.

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

### A. Landing publica

Estado actual aproximado:

- `components/landing/*`: practicamente `0%`
- `LandingContent.tsx`: `0%`
- `LandingAnimations.tsx`: `0%`
- `LocationMap.tsx`: `0%`
- `components/landing/tutorials/*`: `0%`

Riesgo:

- es un arbol grande;
- tiene dynamic imports;
- usa GSAP;
- tiene tutorial carousel;
- contiene copy SEO y CTAs publicos;
- hoy pesa mucho en lines y statements.

### B. Auth UI del jugador

Estado actual:

- `app/(auth)/login/player/page.tsx`: sin cobertura directa relevante;
- `app/(auth)/register/player/page.tsx`: sin cobertura directa relevante;
- otras pantallas de verify/pin/recovery con coverage muy parcial o nula.

Riesgo:

- login y registro son flujos de conversion criticos;
- mezclan validacion local, server actions, Turnstile, OTP, PIN, passkeys y mensajes de error.

### C. Wallet y dashboard del jugador

Estado actual:

- `components/dashboard/PlayerDashboard.tsx`: `0%`
- `components/wallet/WalletContent.tsx`: `0%`
- `components/wallet/TransferModal.tsx`: `0%`
- `components/wallet/TransactionModal.tsx`: `0%`

Riesgo:

- superficie muy visible para el usuario;
- alta carga de estados vacios, listados, errores y acciones financieras;
- un bug aqui afecta soporte, conversion y confianza.

### D. Shell compartido y experiencia transversal

Estado actual:

- `BroadcastBanner.tsx`: `0%`
- `NotificationCenter.tsx`: `0%`
- `PWAInstallPrompt.tsx`: `0%`
- `VoiceChat.tsx`: `0%`
- `SupportChat.tsx`: `0%`
- varios providers con cobertura baja o nula.

Riesgo:

- componentes de gran superficie;
- estados sincronizados con browser APIs;
- propensos a regresiones silenciosas.

### E. Game UI

Estado actual:

- `Lobby.tsx`: `0%`
- multiples overlays/modales en `0%`
- `Board.tsx`: lineas relativamente altas, pero ramas y funciones insuficientes para una pieza tan critica.

Riesgo:

- UI compleja;
- flujos simultaneos;
- multiples permisos/estados del jugador;
- el coverage actual no garantiza confianza funcional suficiente.

### F. Infra web de Supabase y hooks

Estado actual:

- `utils/supabase/server.ts`: muy bajo;
- `utils/supabase/client.ts`: `0%`;
- varios hooks utiles siguen en `0%`.

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
| Fase 0 | `19%` actual | baseline real ya medido |
| Fase 1 | `30%` | cerrar huecos grandes de landing + auth player |
| Fase 2 | `45%` | dashboard, wallet, shell transversal |
| Fase 3 | `60%` | game UI critica y providers importantes |
| Fase 4 | `75%` | hooks, infra web, rutas API y ramas de error |
| Fase 5 | `85%` | consolidacion por dominios y limpieza de huecos |
| Fase 6 | `92%` | coverage casi completa sobre UI y edge cases |
| Fase 7 | `98%` | hardening final y gate total estricto |

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
| L6 | Wallet modals + transferencias | Media | En progreso | L5 | cubrir interacciones financieras UI |
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

- [ ] open/close modal;
- [ ] invalid amount;
- [ ] valid amount;
- [ ] action disabled when pending;
- [ ] visible error handling.

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

- Web: `35%` statements, `70%` branches, `55%` functions, `35%` lines.
- Game server: `85%` statements, `75%` branches, `85%` functions, `86%` lines.

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
