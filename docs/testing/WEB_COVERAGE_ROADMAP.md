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
| L1 | Landing hero + tutoriales base | Alta | Pendiente | ninguna | sacar del `0%` a `LandingContent` y helpers principales |
| L2 | Auth player login | Alta | Pendiente | L1 opcional | cubrir flujo visual de login player |
| L3 | Auth player register | Alta | Pendiente | L2 opcional | cubrir flujo visual de registro player |
| L4 | Auth verify + pin + recovery | Alta | Pendiente | L2 y L3 | cerrar journey auth player completo |
| L5 | Dashboard + wallet shell | Alta | Pendiente | L2 | cubrir post-login de jugador |
| L6 | Wallet modals + transferencias | Media | Pendiente | L5 | cubrir interacciones financieras UI |
| L7 | Shell transversal + providers | Media | Pendiente | ninguna | cubrir componentes compartidos de alto impacto |
| L8 | Game lobby + overlays criticos | Alta | Pendiente | L2 | cubrir game UI con mayor retorno |
| L9 | Board hardening | Alta | Pendiente | L8 | subir ramas y funciones de `Board.tsx` |
| L10 | Hooks + Supabase web infra | Media | Pendiente | ninguna | cubrir adaptadores y hooks en `0%` |
| L11 | API routes web | Media | Pendiente | L10 opcional | cubrir rutas App Router sin tests |
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

- [ ] mocks base reutilizables para landing listos;
- [ ] test render hero;
- [ ] test FAQ;
- [ ] test CTA a login/register;
- [ ] test seleccion de tutorial;
- [ ] test navegacion del carousel;
- [ ] medicion de coverage despues del lote.

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

- [ ] telefono invalido;
- [ ] PIN invalido;
- [ ] cambio a flujo OTP;
- [ ] error de server action;
- [ ] estado pending;
- [ ] passkey disponible;
- [ ] passkey fallida;
- [ ] banner `kicked=true`.

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

- [ ] validacion de nombre;
- [ ] validacion de nickname;
- [ ] validacion de telefono;
- [ ] contador de nickname;
- [ ] seleccion de avatar;
- [ ] hidden input consistente;
- [ ] error de servidor;
- [ ] pending state.

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

- [ ] verify OTP error;
- [ ] verify OTP success state;
- [ ] set PIN validation;
- [ ] recovery form validation;
- [ ] recovery verify errors;
- [ ] disabled/pending states.

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

## Proximo Paso Recomendado

El siguiente lote de ejecucion deberia ser:

1. `components/landing/LandingContent.tsx`
2. `app/(auth)/login/player/page.tsx`
3. `app/(auth)/register/player/page.tsx`

Ese lote combina:

- alto peso en lines/statements;
- alto impacto funcional;
- alto retorno sobre la cobertura global.
