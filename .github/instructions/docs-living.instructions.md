---
applyTo: "docs/**,CHANGELOG.md,README.md"
description: "Reglas de documentacion viva: que archivo actualizar segun el cambio y como sincronizar docs con codigo."
---

# Documentacion Viva

## Principios
- No crear markdown nuevo por defecto. Primero actualizar la documentacion existente.
- Cada cambio funcional debe reflejarse en el archivo que aplique.

## Archivos por tipo de cambio
- Categorias o reorden de docs: `docs/README.md`.
- Cambios de rutas, accesos o estado de implementacion: `docs/product/ROUTES.md`.
- Cambios funcionales visibles o fixes relevantes: `CHANGELOG.md`.
- Instalacion, comandos, env, arranque: `README.md`.
- Herramientas/comandos/estrategia de testing: `docs/testing/TESTING.md`.
- Despliegue, variables o infraestructura: `docs/deployment/deployment.md` y `docs/deployment/DEPLOYMENT.md`.
- Escenarios del motor (`MesaRoom`): `docs/game/GAME_SCENARIOS.md` con ID, fase, regla, logica del servidor, ejemplo y tests.
- Version del motor: `docs/game/MESA_VERSIONS.md`. PATCH visual/animacion, MINOR escenario, MAJOR regla fundamental.

## Decisiones tecnicas
- Decisiones arquitectonicas: usar ADR/RFC con la skill `docs-as-code-adr-rfc-workflow`.
- Linkear ADR/RFC desde el PR y desde el seam de codigo cuando aplique.

## Skills a cargar
- Sincronizar/completar/auditar docs existentes: `update-docs`.
- ADR / RFC: `docs-as-code-adr-rfc-workflow`.
