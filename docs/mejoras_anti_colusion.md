# Mejoras Futuras: Sistema Anti-Colusión Avanzado

El sistema actual (Sprint 6) implementa una **detección pasiva básica** mediante un CronJob que evalúa la frecuencia de emparejamiento entre jugadores.

Para escalar a un entorno de alto volumen y dinero real, se propone el desarrollo de un **Motor Anti-Colusión en Tiempo Real**, cuyas características principales deberían incluir:

## 1. Detección de Colusión Estructural en Cascada

Bloqueos pre-juego antes de que los usuarios se sienten en la mesa matemática:

- **Validación de Subredes IP:** Bloquear el acceso a la misma mesa si dos usuarios comparten la misma dirección IP pública comprobada, o provienen del mismo nodo VPN conocido.
- **Fingerprinting de Dispositivos:** Usar la tabla `user_devices` para asegurar que dos cuentas que han compartido físicamente un mismo dispositivo de hardware (Device ID) jamás puedan sentarse en el mismo juego.

## 2. Prevención de "Chip Dumping" (Drenaje de Fichas) Algorítmico

Análisis del patrón de juego en directo:

- **Modelos Estadísticos (Machine Learning):** Analizar el porcentaje de veces que el Jugador A se retira ("fold") justo después de una apuesta muy agresiva del Jugador B, especialmente cuando A tiene estadísticamente una mano victoriosa (Ej: tiene _Primera_ limpia pero hace fold).
- **Rastreo de Flujo Financiero Cruzado:** Si el 80% de las fichas "perdidas" del Jugador A terminan consistentemente en el `wallet` del Jugador B a base de foldear en Showdowns, disparar el flag rojo automático.

## 3. Resolución Automatizada (Zero Tolerance)

Automatización del castigo sin requerir analista inicial:

- **Inmovilización del Ledger:** Al detectar patrón certero, las billeteras de todos los involucrados entran en estado `locked`, impidiendo retiros hacia fiat u otras cuentas.
- **Baneo Inmediato por WebSocket:** Desconexión forzosa del Colyseus Room enviando el código 4001 (Banned), tirando a los clientes de regreso a la pantalla de login con el aviso de suspensión por violación de ToS.
- **Alerta de Nivel Escalable:** El reporte pasa al dashboard de Super Admin, quien tiene la potestad de confiscar los fondos a favor del casino digital.
