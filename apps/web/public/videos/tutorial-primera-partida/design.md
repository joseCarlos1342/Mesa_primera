# Design.md — Tutorial "Cómo Jugar tu Primera Partida"

## Brand Palette (Mesa Primera)

| Token          | Hex       | Uso                              |
|----------------|-----------|----------------------------------|
| `bg-felt`      | `#073926` | Fondo verde felt de mesa         |
| `bg-felt-alt`  | `#073b24` | Variante más oscura del felt      |
| `gold`         | `#d4af37` | Acentos, bordes, elementos gold   |
| `gold-light`   | `#fdf0a6` | Textos dorados claros            |
| `gold-dark`    | `#8a6d1c` | Borde inferior dorado            |
| `cream`        | `#f3edd7` | Textos primarios                 |
| `cream-dim`    | `#c0a060` | Textos secundarios               |
| `green-bright` | `#4ade80` | Números de saldo, valores       |
| `red-danger`   | `#f87171` | Errores, alertas                |
| `black-deep`   | `#0a180e` | Overlays, fondos profundos      |

## Typography

- **Display**: Georgia, serif (elegante, clásico — como naipes)
- **UI**: System sans-serif fallback
- **Sizes**: 8-14px en mockups (simulando móvil), 48-80px en titles

## Mockup Frames

- Phone mockup: 280px × 500px interno (proporción 9:16 aprox)
- Phone landscape mockup: 500px × 280px interno
- Border radius: 20px exterior, 12px interior
- Border: 2px `#d4af37/20`

## Finger/Tap Indicator

- Circle: 12px diameter, white with 30% opacity
- Tap animation: scale 1 → 1.2 → 1, opacity pulse
- Cursor trail: subtle fade trail

## Transitions

- Scene → Scene: `zoom-through` (scale 0.75 → 1, blur 20px → 0, 0.5s)
- Cross-scene: `blur-through` (0.4s)
- Phone rotate: CSS `rotate(90deg)` con spring easing

## Card Assets

- Path: `/cards/` (01-07 de copas, espadas, oros, bastos)
- Card back: `/images/card-back-rooster.png`
- Size en mockup: 22px × 32px (vertical)

## Logo

- SVG inline en compositions
- Solo se muestra en primer frame y fade final
