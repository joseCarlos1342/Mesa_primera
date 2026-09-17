export const OFFICIAL_RULEBOOK_VERSION = '4.0.0'
export const OFFICIAL_RULEBOOK_EFFECTIVE_DATE = '15 de septiembre de 2026'

export interface RulebookSection {
  id: string
  title: string
  summary: string
  paragraphs: string[]
  bullets?: string[]
}

export const OFFICIAL_RULEBOOK: RulebookSection[] = [
  {
    id: 'objeto',
    title: '1. Objeto y alcance',
    summary: 'La regla que gobierna cada mano',
    paragraphs: [
      'Este reglamento describe la modalidad de Primera Riverada los 4 Ases que ejecuta el servidor de Mesa Primera. El servidor es la autoridad de estado, turnos, cartas, apuestas, resultados y liquidaciones.',
      'No existe captura de cartas ni objetivo de 15: la mano se construye con cuatro cartas y se resuelve por combinación, puntos y las reglas de apuestas descritas aquí.',
    ],
    bullets: ['La versión vigente se muestra en la cabecera de este documento.', 'Las reglas técnicas se versionan junto con el código; los avisos del local se publican como anexo operativo.'],
  },
  {
    id: 'participacion',
    title: '2. Participación y mesas',
    summary: 'Quién puede sentarse y cuándo',
    paragraphs: ['Cada mesa publica su capacidad, pique mínimo, entrada mínima y denominaciones disponibles. Los valores monetarios se expresan en pesos colombianos (COP) y pueden variar por mesa.'],
    bullets: ['Capacidad máxima actual: 7 jugadores.', 'La entrada exige saldo suficiente, pero no inmoviliza un buy-in independiente: las fichas representan el saldo disponible.', 'Quien entra con una mano en curso espera la siguiente.'],
  },
  {
    id: 'baraja',
    title: '3. Baraja y palos',
    summary: 'El material de juego',
    paragraphs: ['Se utiliza una baraja española de 28 cartas: valores del As al 7 en Oros, Copas, Espadas y Bastos. Cada carta es única y el servidor controla el barajado y el reparto.'],
    bullets: ['As, 2, 3, 4, 5, 6 y 7 de cada uno de los cuatro palos.', 'Las cartas privadas solo las recibe su propietario hasta una revelación reglamentaria.', 'Las cartas reveladas quedan registradas en el replay de la mano.'],
  },
  {
    id: 'valores',
    title: '4. Valores de las cartas',
    summary: 'Puntaje base',
    paragraphs: ['Los valores son fijos y se usan para comparar manos del mismo tipo. El As vale 16 puntos; no equivale a 1 punto.'],
    bullets: ['7 = 21 puntos', '6 = 18 puntos', 'As = 16 puntos', '5 = 15 puntos', '4 = 14 puntos', '3 = 13 puntos', '2 = 12 puntos'],
  },
  {
    id: 'inicio',
    title: '5. Inicio de la sesión y La Mano',
    summary: 'Orden inicial y rotación',
    paragraphs: ['La primera mano de la sesión realiza un sorteo público: se reparte una carta por jugador hasta que aparece un Oro. El jugador que recibe el primer Oro es La Mano.', 'En las manos siguientes La Mano rota en el orden de los asientos. Si La Mano se retira, abandona, es expulsada o pierde su asiento durante la mano, el siguiente jugador activo pasa inmediatamente a ser La Mano.'],
    bullets: ['La Mano actúa primero en cada ronda.', 'La Mano activa es la que otorga la ventaja de desempate, no un identificador histórico.', 'La Mano siempre debe resolverse antes del showdown si todavía queda un jugador activo.'],
  },
  {
    id: 'jerarquia',
    title: '6. Jerarquía y valoración',
    summary: 'Qué mano vence a cuál',
    paragraphs: ['La jerarquía es estricta. Primero se compara el tipo de combinación; solo entre manos del mismo tipo se comparan los puntos.'],
    bullets: ['1. Segunda: las cuatro cartas son del mismo palo.', '2. Chivo: contiene As, 6 y 7 del mismo palo, más una cuarta carta.', '3. Primera: contiene una carta de cada palo.', '4. Puntos: no forma una combinación superior; cuenta la suma más alta dentro de un mismo palo.'],
  },
  {
    id: 'pique',
    title: '7. Pique inicial',
    summary: 'La primera decisión con dos cartas',
    paragraphs: ['Después del reparto de dos cartas, La Mano habla primero. En esta fase solo existen las acciones Voy y Paso.', 'La Mano puede fijar el precio del pique, respetando el mínimo de la mesa y sus fichas disponibles. Los demás jugadores deben igualar ese precio o irse de resto si no pueden cubrirlo.'],
    bullets: ['Voy aporta al pique y mantiene al jugador en la disputa.', 'Paso retira al jugador del pique.', 'El pique se guarda separado del pozo principal hasta su resolución.'],
  },
  {
    id: 'banda',
    title: '8. Reapertura, doble botada y Banda',
    summary: 'Qué ocurre si el pique no reúne dos jugadores',
    paragraphs: ['Si al cerrar el pique solo un jugador dijo Voy, su aporte se devuelve, La Mano rota y se reparte nuevamente sin cobrar una entrada adicional. Los jugadores que pasaron pueden quedar habilitados para igualar durante una reapertura.', 'La Banda es una penalidad operativa para quienes pasaron cuando el pique debió reiniciarse. Se cobra conforme a la tarifa configurada y nunca por encima del saldo disponible.'],
    bullets: ['Banda de referencia: $2.000 COP con pique menor a $10.000 COP.', 'Banda de referencia: $5.000 COP con pique igual o superior a $10.000 COP.', 'Una segunda botada con dos cartas del mismo palo puede generar una revelación reglamentaria.'],
  },
  {
    id: 'completar',
    title: '9. Completar la mano',
    summary: 'De dos a cuatro cartas',
    paragraphs: ['Los jugadores que continúan reciben dos cartas adicionales, una por ronda, hasta completar cuatro. Las cartas se entregan desde el fondo del mazo para respetar el orden de devolución de cartas.'],
    bullets: ['Quien está retirado no recibe cartas adicionales.', 'La mano completa queda lista para la apuesta, la validación y el descarte.', 'Todas las cartas y entregas son controladas por el servidor.'],
  },
  {
    id: 'apuesta-cuatro',
    title: '10. Apuesta con cuatro cartas',
    summary: 'La ronda que abre el pozo principal',
    paragraphs: ['Con cuatro cartas comienza una ronda de apuestas desde La Mano. En esta ronda y en Guerra se puede pasar, igualar, subir o ir de resto.', 'Una subida debe superar la apuesta máxima vigente. La apuesta no igualada se devuelve al apostador antes de liquidar el pozo.'],
    bullets: ['Paso sin apuesta pendiente equivale a check y mantiene al jugador.', 'Paso frente a una apuesta retira al jugador, salvo la resolución especial de Llevo Juego.', 'Igualar cubre solo la diferencia necesaria.', 'Resto aporta todas las fichas disponibles y deja al jugador all-in.'],
  },
  {
    id: 'llevo-juego',
    title: '11. Llevo Juego',
    summary: 'Paso con una combinación válida',
    paragraphs: ['Cuando un jugador enfrenta una apuesta y tiene Segunda, Chivo o Primera, el servidor abre la decisión Llevo Juego / No Llevo. La mano real se vuelve a evaluar en el servidor; el cliente no puede inventar una combinación.', 'Llevo Juego retira al jugador del pozo principal y conserva su derecho a competir por el pique. No Llevo confirma el retiro y devuelve sus cartas al mazo cuando corresponde.'],
  },
  {
    id: 'validacion',
    title: '12. Validación de juego',
    summary: 'Decisión simultánea después de todos los checks',
    paragraphs: ['Si todos pasan en la apuesta de cuatro cartas y existe al menos una combinación válida, el servidor abre una ventana simultánea de 30 segundos. Cada jugador activo recibe sus propias opciones sin revelar públicamente quién tiene juego.'],
    bullets: ['Pasar: no reclamar juego ni aportar al pique.', 'Igualar: aportar como mínimo el pique configurado.', 'Llevo Juego: reclamar una combinación válida y disputar el pique.', 'Al vencer el tiempo, la respuesta pendiente se considera Pasar.'],
  },
  {
    id: 'descarte',
    title: '13. Descarte y reposición',
    summary: 'Cambiar cartas antes de Guerra',
    paragraphs: ['Cada jugador activo decide qué cartas descarta o conserva las cuatro. Las cartas descartadas vuelven al mazo y el servidor entrega las reposiciones desde el fondo.', 'El servidor valida que cada carta descartada pertenezca realmente a la mano y que no se repita. Las cartas inválidas no alteran el estado de la partida.'],
  },
  {
    id: 'carta-fondo',
    title: '14. Carta del fondo',
    summary: 'Revelación informativa',
    paragraphs: ['Después de la reposición se revela una carta del fondo durante unos segundos. Esta carta es únicamente informativa y ceremonial: no cambia el puntaje, las apuestas, la jerarquía ni el ganador.'],
  },
  {
    id: 'guerra',
    title: '15. Guerra',
    summary: 'La ronda fuerte de apuestas',
    paragraphs: ['Guerra es una nueva ronda de apuestas con las cuatro cartas definitivas. Comienza desde La Mano y utiliza las mismas acciones: Paso, Igualar, Voy y Resto.', 'Si todos pasan en Guerra, no se abre Cánticos y se continúa a la declaración de juego.'],
  },
  {
    id: 'canticos',
    title: '16. Cánticos',
    summary: 'Ronda adicional cuando hubo apuesta',
    paragraphs: ['Cánticos no es una acción distinta ni permite cantar una cantidad especial: es una segunda ronda normal de apuestas que solo se abre cuando Guerra tuvo al menos una apuesta.'],
  },
  {
    id: 'declaracion',
    title: '17. Declaración de juego',
    summary: 'Confirmación antes del showdown',
    paragraphs: ['Cuando no hubo apuesta en Cánticos, el servidor solicita declarar juego. La declaración visual es una confirmación de una evaluación que ya hizo el servidor; nunca puede convertir una mano sin combinación en una mano válida.'],
    bullets: ['Cero jugadores con juego: se compara por Puntos en el showdown.', 'Un jugador con juego: gana la disputa y debe mostrar sus cartas.', 'Dos o más jugadores con juego: pasan a Guerra de Juego.'],
  },
  {
    id: 'guerra-juego',
    title: '18. Guerra de Juego',
    summary: 'Apuesta solo entre quienes declararon juego',
    paragraphs: ['En Guerra de Juego participan exclusivamente los jugadores que declararon una combinación válida. Quien no iguala una apuesta adicional conserva su elegibilidad para el showdown, pero no aporta más a esa ronda.'],
  },
  {
    id: 'desempates',
    title: '19. Desempates y división de pozos',
    summary: 'La regla que protege cada peso apostado',
    paragraphs: ['Se compara primero la jerarquía y después los puntos. La Mano activa recibe un punto adicional exclusivamente para el desempate. Si dos o más jugadores siguen exactamente iguales después de aplicar ese punto, todos son ganadores de ese pozo.', 'Cada pozo se divide de forma independiente, incluidos los pozos secundarios. El importe indivisible se asigna de manera determinista siguiendo el orden de los asientos elegibles; nunca se decide por el orden accidental de un objeto interno.'],
    bullets: ['Ejemplo: Segunda de 55 contra Segunda de 56; si la de 55 pertenece a La Mano, queda 56 contra 56 y el pozo se divide.', 'Ejemplo: dos Segundas de 55 sin ser La Mano empatan y comparten el pozo.', 'El bono de La Mano se aplica antes de decidir si existe empate residual.'],
  },
  {
    id: 'showdown',
    title: '20. Showdown',
    summary: 'Revelación y determinación del ganador',
    paragraphs: ['Con dos o más competidores activos, todos deben mostrar sus cartas. El servidor evalúa cada mano y adjudica cada pozo a los mejores jugadores elegibles.', 'Si queda un único jugador, puede existir una ventana para mostrar u ocultar cuando la regla lo permita. Si ganó por declaración de juego, la muestra es obligatoria.'],
  },
  {
    id: 'all-in',
    title: '21. Resto y pozos secundarios',
    summary: 'Cuando no todos pueden apostar lo mismo',
    paragraphs: ['Un jugador puede ir de resto con sus fichas disponibles aunque no alcance la apuesta de otro. El pozo se divide en niveles según la contribución total de cada jugador; cada nivel solo puede ganarlo quien contribuyó a él.'],
    bullets: ['El servidor calcula los pozos secundarios, no el cliente.', 'Un jugador all-in continúa elegible para los pozos que cubrió.', 'Las apuestas no igualadas se devuelven antes del cálculo final.'],
  },
  {
    id: 'economia',
    title: '22. Liquidación y devoluciones',
    summary: 'Cómo se conserva el saldo',
    paragraphs: ['Las apuestas se descuentan del saldo cuando se aceptan. Los premios se acreditan únicamente después de determinar el resultado. Toda operación financiera debe quedar en el ledger inmutable con una referencia idempotente.', 'Si una mano se cancela por cierre, crash o desconexión masiva, el sistema devuelve las contribuciones que corresponda según el incidente y registra la compensación.'],
    bullets: ['No se cobra una entrada adicional al reiniciar un pique.', 'El exceso de una apuesta no igualada se devuelve sin comisión.', 'Un reintento de la misma operación no puede duplicar un débito ni un premio.'],
  },
  {
    id: 'rake',
    title: '23. Reglas económicas',
    summary: 'Rake y moneda del juego',
    paragraphs: ['La mesa aplica un rake del 5% sobre cada pozo adjudicado. El rake se calcula una sola vez sobre el importe bruto del pozo, antes de repartir el neto entre los ganadores.', 'Los premios se expresan en COP y se registran en el ledger. El saldo visible de fichas debe coincidir con el saldo persistido una vez confirmada la liquidación.'],
    bullets: ['En un empate, primero se descuenta el 5% del pozo completo y después se divide el neto.', 'El redondeo del rake se hace al bloque mínimo definido por el sistema.', 'La plataforma no promete disponibilidad de retiros fuera de sus procesos de revisión y aprobación.'],
  },
  {
    id: 'tiempos',
    title: '24. Tiempo, desconexión y abandono',
    summary: 'Qué pasa si no respondes',
    paragraphs: ['Cada turno normal tiene 120 segundos para responder. La ventana de decisión de juego tiene 30 segundos. El showdown visual cuenta con cierre automático para evitar que la mesa quede bloqueada.', 'Ante una desconexión no consentida, el jugador conserva su asiento y estado durante exactamente 60 segundos. Si reconecta dentro de ese plazo, recupera su mano y su turno. Después del plazo, el servidor libera el asiento y aplica la resolución correspondiente.'],
    bullets: ['Un abandono voluntario es inmediato y no genera devolución automática de lo ya apostado.', 'El timeout de un turno aplica la acción automática definida para esa fase.', 'Nunca se debe abrir una segunda sesión para intentar alterar una mano en curso.'],
  },
  {
    id: 'integridad',
    title: '25. Integridad, replays y disputas',
    summary: 'La mesa debe poder auditarse',
    paragraphs: ['Está prohibida la colusión, el chip dumping, el uso de bots o software externo, la suplantación, las multicuentas, la manipulación del cliente y cualquier comprobante financiero falso.', 'El servidor conserva eventos, semilla, estados y resultado para generar un replay. El replay es la base técnica para investigar una disputa; no se modifica para favorecer a un jugador.'],
    bullets: ['El administrador no recibe cartas privadas ni estado oculto de jugadores activos.', 'Una disputa debe incluir la mesa, hora aproximada y descripción del incidente.', 'La plataforma puede suspender cuentas mientras investiga fraude o abuso.'],
  },
  {
    id: 'responsabilidad',
    title: '26. Juego responsable y cumplimiento',
    summary: 'Condiciones para operar con dinero real',
    paragraphs: ['Este reglamento de producto no sustituye la revisión jurídica, regulatoria, tributaria ni de juego responsable exigible para operar apuestas reales en Colombia. La operación debe habilitarse solo cuando la plataforma pueda verificar edad, identidad, territorio, límites y obligaciones aplicables.', 'El jugador debe tener la edad legal aplicable, entregar datos verídicos y usar únicamente medios de pago propios. Los retiros pueden estar sujetos a revisión de titularidad y prevención de fraude.'],
  },
  {
    id: 'glosario',
    title: '27. Glosario rápido',
    summary: 'Palabras de la mesa',
    paragraphs: ['La Mano: jugador que abre las rondas y recibe el bono de desempate. Pique: disputa inicial separada del pozo principal. Pozo: conjunto de apuestas que puede ganar una mano elegible. Resto: apuesta de todas las fichas disponibles. Showdown: revelación y comparación final. Rake: comisión del 5% sobre el pozo adjudicado.'],
  },
]
