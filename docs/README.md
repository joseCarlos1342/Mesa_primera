# Documentación de Mesa Primera

Esta carpeta se organiza por dominio para evitar archivos sueltos en la raíz de `docs/`.

## Estructura

- `admin/`: guías funcionales, seguridad y referencia técnica del panel administrativo.
- `deployment/`: despliegue general, guías específicas de infraestructura y operación del VPS.
- `game/`: escenarios, versionado del motor, notas de refactor y fixes ligados al flujo de juego.
- `product/`: mapa de rutas, documentación histórica por sprint y guías funcionales del recorrido del jugador.
- `testing/`: estrategia, comandos y criterios de prueba.
- `security/`: mejoras y notas de seguridad transversales.

## Guías clave

- `deployment/DEPLOYMENT.md`: despliegue general de la plataforma.
- `deployment/deployment.md`: guía específica del entorno CubePath/Vercel de hackatón.
- `deployment/vps_actualizacion_motor.md`: operación manual del VPS del motor de juego.
- `admin/README.md`: guía operativa del panel admin desde el login hasta la supervisión.
- `game/GAME_SCENARIOS.md`: cambios reglamentarios o escenarios del `MesaRoom`.
- `deployment/email-soporte-profesional.md`: estado final del correo profesional de soporte con Cloudflare Email Routing + Brevo SMTP + Gmail.
- `game/MESA_VERSIONS.md`: historial de versiones del motor.
- `product/ROUTES.md`: estado y cobertura de rutas del producto.
- `product/player/README.md`: guía del jugador desde el registro hasta la mesa.
- `product/sprints/`: bitácora histórica de entregas.
- `testing/TESTING.md`: estrategia y comandos de testing.

## Regla de mantenimiento

- No agregar nuevos `.md` en la raíz de `docs/`.
- Reutilizar la carpeta temática que corresponda antes de crear una nueva.
- Si aparece un nuevo dominio documental, actualizar este índice.