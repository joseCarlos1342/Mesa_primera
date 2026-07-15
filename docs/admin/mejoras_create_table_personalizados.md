# Mejoras Futuras: Valores Personalizados en `CreateTableModal`

El modal de creación de mesa (`apps/web/src/components/admin/CreateTableModal.tsx`) expone actualmente el saldo mínimo de entrada y el pique mínimo como **chips de valores fijos** definidos en constantes hardcodeadas:

- `ENTRY_PRESETS`: `$50K`, `$100K`, `$200K`, `$500K`
- `PIQUE_PRESETS`: `$5K`, `$10K`, `$20K`, `$50K`

Esto fuerza al admin a elegir entre cuatro opciones por categoría. Si el local necesita una mesa VIP con entrada de `$750K` o un pique personalizado de `$15K`, el admin no tiene cómo hacerlo desde la UI: tendría que ajustar la fila directamente en la base de datos.

## 1. Estado actual

### Dónde está

- Componente: `apps/web/src/components/admin/CreateTableModal.tsx`
- Constantes hardcodeadas: líneas 18-30 (`ENTRY_PRESETS` y `PIQUE_PRESETS`)
- Server actions: `createTable` y `createCustomTable` en `apps/web/src/app/actions/admin-tables.ts`
- Categoría: solo se muestra el campo personalizado cuando `category === "custom"`

### Lo que el admin puede hacer hoy

- Elegir uno de los 4 valores de `ENTRY_PRESETS` para saldo mínimo.
- Elegir uno de los 4 valores de `PIQUE_PRESETS` para pique mínimo.
- Deshabilitar fichas (chips de denominación).

### Lo que el admin **no** puede hacer

- Definir un saldo mínimo de entrada que no esté en los presets (ej. `$750K`, `$1M`, `$80K`).
- Definir un pique mínimo personalizado (ej. `$7K`, `$15K`, `$25K`).
- Validar la coherencia entre entrada y pique (ej. un pique mayor que la entrada).
- Aceptar valores en una moneda distinta (hoy todo se asume en centavos COP sin sufijo explícito).

## 2. Por qué importa

Casos de uso reales que hoy requieren tocar la BD:

- Mesa VIP de inauguración con entrada de `$1M COP` y pique de `$50K`.
- Mesa de práctica con entrada `$10K` y pique `$1K` (por debajo del preset mínimo).
- Mesa de torneo temporal con entrada `$750K` que no se quiere como preset permanente.
- Evento especial con pique `$25K` que no encaja en `$20K` ni en `$50K`.

Cada vez que se da uno de estos casos, alguien tiene que salir de la UI, abrir SQL, hacer un UPDATE y volver. Eso rompe el flujo de "admin no toca la BD directamente" del proyecto.

## 3. Solución propuesta

### 3.1 Inputs numéricos al lado de los chips

Mantener los chips como atajo (poder clickear y listo) y añadir un input numérico adyacente que sobreescriba el valor cuando se escribe. Patrón:

```
[ $50K ] [ $100K ] [ $200K ] [ $500K ] | Otro: [ ______ ] COP
```

El input "Otro" acepta cualquier valor entero en centavos (sin prefijo, o con sufijo COP visible). Si está vacío, se usa el último chip clickeado. Si tiene valor, sobrescribe.

Beneficio: el admin sigue teniendo los presets como atajo, pero puede afinar cuando lo necesita. No se rompe el flujo actual.

### 3.2 Validación cliente + servidor

Antes de submit, validar:

- `min_entry_cents > 0` y `min_pique_cents > 0`.
- `min_entry_cents >= min_pique_cents` (no tiene sentido que el pique sea mayor que la entrada).
- `min_entry_cents` y `min_pique_cents` son múltiplos de 1000 (para que el formateo de moneda no muestre decimales raros). Esto es opcional — se puede permitir cualquier múltiplo de 100 si el sistema lo soporta.

Mostrar mensajes de error inline al lado de cada campo, no como `alert()` global (que es el patrón actual y es ruidoso).

### 3.3 Refactor de constantes

Mover `ENTRY_PRESETS` y `PIQUE_PRESETS` a un archivo de configuración centralizado, por ejemplo `apps/web/src/config/table-presets.ts`, con tipos estrictos. Esto facilita que en el futuro esos presets se lean de la BD o de un archivo de config por local (multi-tenant).

```ts
// apps/web/src/config/table-presets.ts
export type EntryPreset = { valueCents: number; label: string }
export const DEFAULT_ENTRY_PRESETS: readonly EntryPreset[] = [
  { valueCents: 5_000_000, label: '$50K' },
  { valueCents: 10_000_000, label: '$100K' },
  { valueCents: 20_000_000, label: '$200K' },
  { valueCents: 50_000_000, label: '$500K' },
] as const
```

### 3.4 Server actions sin cambios

Las acciones `createTable` y `createCustomTable` ya reciben `min_entry_cents` y `min_pique_cents` como números. No requieren cambios — el cambio es puramente de UI. Esto reduce el riesgo de regresión.

Validar igualmente que el server action rechace valores negativos o cero (defensa en profundidad, hoy probablemente no lo hace). Confirmar con el server action actual antes de implementar.

## 4. Trabajo relacionado

- Si se introduce un input numérico, el formateo en pantalla debe seguir el patrón `formatCurrency` de `apps/web/src/utils/format.ts` para mantener consistencia con el resto del admin.
- Si se quiere persistir presets personalizados por local, requiere migración nueva a `table_config_presets` con FK a `tables` o a una nueva tabla `table_presets`. Está fuera del alcance de esta mejora y debe discutirse con producto.
- Documentar en `docs/admin/ADMIN.md` y `docs/admin/ADMIN_TECHNICAL.md` si se hace el refactor de constantes.

## 5. Parche temporal viable (si urge antes de la mejora)

Si el admin necesita crear una mesa con valores no-preset **ya mismo**, las opciones son:

1. **Desde psql/SQL Editor de Supabase**: un UPDATE directo a la fila creada con los valores deseados.
2. **Script one-off en `apps/web/scripts/`** que use la `service_role` para hacer el insert. Riesgo: deja la action desincronizada respecto a la BD si el admin luego edita la mesa desde otra UI.

Ninguna es ideal, pero ambas son válidas mientras se prioriza la mejora.

## 6. Riesgos

- **Validación doble**: si la validación cliente y servidor divergen, el admin puede saltarse reglas. Hay que mantener ambos en sync.
- **Precisión de moneda**: si el sistema usa centavos enteros (lo cual parece, viendo el sufijo `_cents` en los nombres de campo), hay que validar que el input no acepte decimales. O permitir decimales y redondear — eso depende de la decisión de producto.
- **Localización**: hoy todos los chips asumen formato `$XXK` en pesos colombianos. Si en el futuro se admite otra moneda, hay que repensar tanto los presets como el input.
- **Regresión visual**: añadir un input al lado de los chips cambia el layout. Hay que verificar que en mobile los chips sigan siendo usables (probablemente el input pase a una segunda fila en mobile).

## 7. Resumen de prioridad sugerida

| Mejora | Coste | Valor | Prioridad |
|---|---|---|---|
| 3.1 Input numérico al lado de chips | 2-3 h | Alto | **Hacer pronto** |
| 3.2 Validación cliente + servidor | 1-2 h | Alto | Hacer con 3.1 |
| 3.3 Refactor de constantes a archivo | 30 min | Bajo | Hacer con 3.1 |
| 3.4 Confirmar server action | 30 min | Medio | Hacer con 3.1 |
| Persistir presets por local | 1-2 sprints | Bajo (YAGNI hoy) | Solo si producto lo pide |
