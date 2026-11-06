---
version: 1
slug: "src-components-landing-landingcontent-tsx"
primary_target: "src/components/landing/LandingContent.tsx"
related_targets: []
---

## Scope

Landing pública `/` (`apps/web/src/components/landing/LandingContent.tsx`). Mode: Persuade. Acción: registro online (`/register/player`); el club físico es prueba.

## Direction contract

THESIS: La baraja completa es el tablero. La página enseña la Primera con las 28 cartas reales en una rejilla palo × valor; rechaza el hero centrado sobre fondo con iconos flotantes y la fila de tarjetas iguales.

OWN-WORLD: Paño de cuero verde botella (#0a2c20 / #0a2a1f, luz #45996c) dentro de canto de nogal (#120806 / #35180f), cartas reales con sombra física, filetes de latón (#8b6b2e), un solo dorado (#e2b044) para la acción. Alegreya para marca y titulares, Source Sans 3 para lectura, Geist Mono para valores (21, 18, 16…).

STORY: El visitante ve la baraja española que conoce, entiende en cuatro pasos qué mano gana (Segunda > Chivo > Primera > Puntos) sobre esa misma rejilla, ve que registrarse son tres pasos, confirma que el club existe en Neiva y crea su cuenta.

FIRST VIEWPORT: Desktop: columna izquierda (≈40%) con marca Alegreya grande, subtítulo, CTA dorado "Crear cuenta gratis" + "Iniciar sesión" secundario; derecha (≈60%) la mesa con la rejilla 4 filas (Oros, Copas, Espadas, Bastos) × 7 columnas (As…7) de cartas reales, etiquetas de palo y valor en mono. Móvil: marca + CTA arriba, debajo la rejilla en abanico compacto 4 × 7 a escala reducida que se ve completa. Reparto en cascada una vez.

FORM: "La baraja abierta", posición 3 de 7 en la lista ordenada (repartida en el sorteo como líder). Seed key 0d06a46c. Firma: la sección "Cómo se gana" fija la rejilla (pin) y en cada paso de scroll ilumina la combinación (fila = Segunda; As-6-7 = Chivo; una por palo = Primera; suma = Puntos); lo ya enseñado queda tenue, lo nuevo entra brillante (disciplina tomada del manual de armado por pasos). Móvil sin pin: cada mano como bloque propio.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones

- Usuario dijo "procede" sin elegir: se toma la dirección asignada (A) y los 8 cambios de texto propuestos.
- Code-led (no hay generación de imágenes).
- Sin fotos del local: slot preparado y vacío.
