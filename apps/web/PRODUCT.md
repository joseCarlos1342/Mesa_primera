# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Jugadores de Primera Riverada de Neiva (Huila) y la región, mayoritariamente adultos mayores, que conocen el juego de mesa presencial y quieren jugarlo online en tiempo real desde el celular.
- Visitantes que buscan un club de cartas y tomadero en Neiva (búsqueda local) y deciden si ir o registrarse.

## Product Purpose

Primera Riverada los 4 Ases digitaliza la Primera Riverada tradicional colombiana (baraja española de 28 cartas) en mesas multijugador en tiempo real, respaldadas por un club físico real en Neiva. El éxito de la landing es el registro online (`/register/player`); el club físico actúa como prueba de que el lugar y la comunidad son reales.

## Positioning

Es la mesa de un club real de Neiva (Cra. 7 #06-87), conocido también como Primera Riverada Dario, llevada a online con las reglas oficiales del club ejecutadas por el servidor. No es un casino genérico: es un club tradicional de cartas, dominó y bebidas.

## Operating Context

- Juego: baraja española de 28 cartas (As al 7 de Oros, Copas, Espadas y Bastos), manos de cuatro cartas.
- Jerarquía oficial (reglamento v4.0.0, `src/lib/official-rulebook.ts`): Segunda (cuatro del mismo palo) > Chivo (As, 6 y 7 del mismo palo más una cuarta) > Primera (una de cada palo) > Puntos (suma más alta dentro de un palo).
- Valores: 7 = 21, 6 = 18, As = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12.
- Flujo del jugador: registro con celular, carga de saldo vía Nequi, entrar a una mesa activa. App instalable (PWA).
- Club físico: Primera, dominó, parqués, bebidas con y sin alcohol.

## Capabilities and Constraints

- Next.js 16 / React 19 / Tailwind 4; GSAP ya instalado. Sin WebGL en la landing.
- Rendimiento: LCP < 2.5 s en móvil 4G gama media, CLS < 0.05, < 60 KB de JS nuevo.
- Deben conservarse: metadatos SEO, JSON-LD FAQ, texto `sr-only` SEO, rutas de registro/login, mapa diferido, catálogo y modal de tutoriales, FAQ, enlaces `/rules` y `/security-policy`, legales, footer con crédito a Gnesis.
- Copy: solo se cambia cuando aporta claridad, conversión o SEO; nunca se inventan datos.

## Brand Commitments

- Nombre: Primera Riverada los 4 Ases. Logo en `public/brand/logo-transparent.svg`.
- Paleta y tipografía fijadas en `src/design/DESIGN-player.md` (Alegreya, Source Sans 3, Geist Mono); no se cambian.
- No debe parecer casino genérico (neón, fichas, "¡GANA YA!").

## Evidence on Hand

- 28 cartas reales en `public/cards/NN-palo.png` y reverso `public/images/card-back-rooster.png`.
- Video de tutorial de registro en `public/tutorials/`.
- Dirección y coordenadas reales (`LocationMap.tsx`).
- No hay fotos del establecimiento, testimonios, cifras de jugadores ni años de antigüedad verificados: no deben fabricarse.

## Product Principles

1. La mesa enseña: mostrar el juego real antes de pedir algo.
2. Club real antes que casino: tradición, comunidad y juego limpio.
3. Legible para todos: lectura cómoda para personas mayores por encima de cualquier efecto.
4. Verdad del reglamento: todo lo que se muestra del juego sale de las reglas oficiales.

## Accessibility & Inclusion

Público principal de personas mayores: base de 18px, contraste AAA en cuerpo, objetivos táctiles de 44px o más, nada esencial escondido tras gestos, `prefers-reduced-motion` respetado con versión estática completa.
