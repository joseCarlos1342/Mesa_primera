---
version: 1
slug: "src-app-player-layout-tsx"
primary_target: "src/app/(player)/layout.tsx"
related_targets:
  - "src/components/player"
  - "src/components/navigation/BottomNav.tsx"
  - "src/components/dashboard/PlayerDashboard.tsx"
  - "src/components/wallet"
  - "src/app/(player)/wallet"
  - "src/app/(player)/stats"
  - "src/app/(player)/friends"
  - "src/app/(player)/profile"
  - "src/components/NotificationCenter.tsx"
  - "src/components/SupportChat.tsx"
---

## Scope

App del jugador después de iniciar sesión: marco (cabecera y navegación), Inicio, Billetera (carga, retiro, historial, transferencia, detalle), Estadísticas, Amigos (lista, solicitudes, agregar, chat, eliminar), Perfil, Soporte (rama jugador) y Notificaciones, más Toast, BroadcastBanner y PWAInstallPrompt. Mode: Operate. Segunda tanda (2026-11-05): lobby (`/lobby`) con estado real del servidor, hoja de recarga, repeticiones (lista, mesa, reproductor con la misma mesa que la partida), sala de espera y pantallas de carga/error/orientación de `/play`, menú de opciones de la mesa, confirmaciones propias (sin `alert`/`confirm`) y legales `/terms` y `/privacy`. Fuera de alcance: `/leaderboard`, la partida (`Board`, ya rediseñada) y los tutoriales de la landing.

## Direction contract

THESIS: La app del club. Misma materia que "La baraja abierta" (negro, nogal, latón, un solo dorado), aplicada a una herramienta de uso diario para personas mayores en el celular. Rechaza cristal, texto degradado, botones 3D con brillo, tarjetas azul medianoche y etiquetas de 8–11px en mayúsculas.

OWN-WORLD: Fondo negro liso; cabecera y barra de pestañas en nogal con filete de latón; el paño con canto de nogal solo para el saldo; listas como filas con filetes; Alegreya en títulos, Source Sans 3 de 18px para leer, Geist Mono para montos, fechas y teléfonos.

STORY: El jugador abre la app, ve su saldo sobre la mesa y un único botón dorado "Jugar ahora"; sabe dónde está cada cosa por cinco pestañas (Inicio · Mesas · Billetera · Amigos · Perfil); cualquier tarea (cargar, retirar, transferir, agregar o quitar un amigo, cerrar sesión) se resuelve en una hoja que sube desde abajo y se cierra igual en todas partes.

FIRST VIEWPORT (Inicio, 390px): cabecera con avatar y alias (a Perfil), Soporte y Notificaciones; panel de saldo con "Jugar ahora", "Cargar saldo" y "Retirar"; debajo "Tu juego" con tres cifras. Escritorio: riel lateral de 112px y dos columnas (saldo y juego | últimos movimientos).

FORM: PlayerSheet como gesto único de la app (hoja inferior en móvil, diálogo o panel en escritorio).

## Decisiones

- Usuario eligió barra Inicio · Mesas · Billetera · Amigos · Perfil; Estadísticas desde Inicio y Perfil; Reglas, Soporte y Cerrar sesión dentro de Perfil.
- Usuario autorizó pruebas reales con la cuenta 0000000002. Se probaron búsqueda de transferencia, agregar amigo, chat y hojas de confirmación.
- Cambios de texto aprobados: "Aún no tienes movimientos", título "Estadísticas" sin "Salón de la Fama/Elite Club", "Tu saldo", "Jugar ahora", "Soporte", "Otro monto".
- Code-led (sin generación de imágenes). Rama admin/embebida de SupportChat intacta.
- Corrección lateral: `checkAccountSanction` trataba la respuesta `null` (sin sanción) como fallo y bloqueaba todo inicio de sesión; ahora `null` = habilitado y un error sigue cerrando el acceso.

## Verificación

- Capturas 390 y 1440 de todas las pantallas y hojas (antes/después).
- `impeccable detect`: sin hallazgos en código del jugador (el indigo restante es la rama admin de SupportChat).
- Jest coverage 99.49 / 92.89 / 98.3 / 99.49; lint 0 avisos; `tsc` limpio; `design:lint` 0 avisos.

## Segunda tanda

- La repetición y la sala de espera reutilizan `TableSurface`/`TablePots` de la partida: una sola mesa en todo el producto.
- Desbloqueo de mesas: `check_table_access` estaba revocado a `service_role` desde mayo y el game server trataba "sin sanción" (`null`) como error. Corregidos el código (game-server y web) y el permiso.
- Migraciones pendientes de septiembre aplicadas tras respaldo; el índice anti doble pago se limita a filas desde 2026-09-15 por 10 duplicados históricos documentados en `docs/finance/ledger-duplicados-2026-04.md` (reversos pendientes de decisión).
- Frames de repetición persistidos en `game_replay_frames` (solo `service_role`).
- Verificación: capturas 390, 844×390 y 1440; Jest 250 suites, cobertura 99.56/93.43/98.27/99.56; game-server 879 tests, cobertura 89.81/80.97/93.57/92.33; lint, `tsc` y `design:lint` limpios.
