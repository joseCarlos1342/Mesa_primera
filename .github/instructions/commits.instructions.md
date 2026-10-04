---
description: "Use when the user asks to make a commit, /commit, write a commit message, or stage changes in this repo."
---

# Commits - Conventional Commits en espanol

## Formato
`<tipo>(<alcance>): <descripcion corta en imperativo>`

## Tipos permitidos
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## Reglas
- En espanol, imperativo, primera linea <= 72 caracteres.
- Body solo si aporta contexto tecnico util.
- No commitear sin validar al menos el area afectada.
- `husky` + `commitlint` (`@commitlint/config-conventional`) validan formato; no es sustituto de tests.

## Ejemplos
- `fix(auth): corregir flujo de enrolamiento MFA`
- `feat(wallet): agregar historial paginado`
- `docs(routes): actualizar rutas del admin`

## Autoridad y flujo
- Esta instrucción es la fuente de verdad para commits del repositorio.
- La ejecución agrupada corresponde al agente `.opencode/agents/deploy-and-commit.md` o al comando global `commit-all`.
- No cargar ni usar una skill separada de commits: duplicaba esta política y permitía tipos no autorizados por el repositorio.
- Nunca crear un commit automáticamente al terminar una tarea.
- `git push` requiere una confirmación explícita separada, aunque el usuario haya pedido crear el commit.

## Body recomendado para cambios no triviales
```
Por que: <razon de negocio o tecnica>
Impacto: <que cambia en runtime>
Riesgos: <que vigilar tras el deploy>
```
