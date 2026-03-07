# Documentación de Fase: Sprint 3 (Interfaz de Juego + UX + PWA)

**Estado:** En Progreso 🚧

## Resumen del Sprint

El Sprint 3 se enfoca en la construcción de la **Interfaz de Juego (UI/UX)** principal, garantizando que sea una experiencia inmersiva, PWA "mobile-first", y que reaccione fluidamente al estado del servidor (Colyseus).

## Objetivos del Sprint

1. **Mesa Base y Mobile-First (✅ Terminado):** UI top-down para la Mesa de juego. Diseño responsivo portrait.
2. **Assets y Animaciones (✅ Terminado):** Implementar SVG de naipes españoles servidos desde CDN. Añadir animaciones fluidas (volteo, movimiento, reparto).
3. **Controles de Apuesta (✅ Terminado):** Botones gigantes "VOY" y "PASO" (para la Fase 2), y controles de "GUERRA" con selector de fichas. Añadir feedback haptico táctil.
4. **Indicadores UX (✅ Terminado):** Panel de info con suma automática de puntos, temporizador de turno, e indicadores de a quién le toca jugar.
5. **Colyseus Backend y Flujo (✅ Terminado):**
   - Temporizador (countdown) de 60s para auto-empezar ronda (cuando hay ≥ 3 jugadores listos).
   - "Host" transferible (dealerId cambia si el jugador anfitrión se desconecta en Lobby).
   - Ventana de 5 minutos exactos para reconexion por desconexión en media partida.
   - Max players reducido a 6 en MeseRoom.
6. **Calidad de Vida:**
   - [ ] Notificaciones sutiles tácticas (ej. sugerencias automáticas "¡Tienes Chivo!").
   - [x] Wake Lock API para mantener la pantalla de los móviles encendida durante la partida.
   - [ ] UI de reconexión con "spinner" si el usuario pierde señal momentánea.
   - [ ] Modal de "Reglamento" accesible desde el menú In-Game.

## Notas Técnicas

- Todo componente nuevo debe revisarse bajo las reglas de `vercel-react-best-practices` y `tailwind-design-system` según `.cursorrules`.
- Los Assets pesados (cartas) deben aislarse para no bloquear el Next.js server bundle.
