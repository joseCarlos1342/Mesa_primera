import type { TutorialStep, TutorialVideoAsset } from './tutorials/TutorialWalkthrough'

export type TutorialPreviewTone = 'system' | 'auth' | 'wallet' | 'game' | 'social'

export interface TutorialDefinition {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly stepCount: number
  readonly preview: {
    readonly eyebrow: string
    readonly action: string
    readonly tone: TutorialPreviewTone
  }
  readonly video?: TutorialVideoAsset
  readonly loader: () => Promise<TutorialStep[]>
}

export const TUTORIAL_CATALOG = [
  {
    key: 'install',
    title: 'Cómo instalar la app',
    description: 'Agrega Mesa Primera a tu celular como app.',
    stepCount: 5,
    preview: { eyebrow: 'Instalación', action: 'Instalar app', tone: 'system' },
    loader: () => import('./tutorials/InstallAppTutorial').then((module) => module.installAppSteps),
  },
  {
    key: 'register',
    title: 'Cómo registrarte',
    description: 'Crea tu cuenta en menos de 2 minutos.',
    stepCount: 4,
    preview: { eyebrow: 'Nueva cuenta', action: 'Reclamar mi lugar', tone: 'auth' },
    video: {
      src: '/tutorials/register-tutorial.mp4',
      poster: '/tutorials/register-tutorial-poster.png',
      title: 'Guía animada para registrarte en Mesa Primera',
      captions: '/tutorials/register-tutorial.vtt',
    },
    loader: () => import('./tutorials/RegisterTutorial').then((module) => module.registerSteps),
  },
  {
    key: 'login',
    title: 'Cómo iniciar sesión',
    description: 'Entra con tu teléfono, PIN o huella.',
    stepCount: 4,
    preview: { eyebrow: 'Acceso seguro', action: 'Entrar a jugar', tone: 'auth' },
    loader: () => import('./tutorials/LoginTutorial').then((module) => module.loginSteps),
  },
  {
    key: 'wallet',
    title: 'Cómo cargar saldo',
    description: 'Deposita fondos vía Nequi y juega.',
    stepCount: 4,
    preview: { eyebrow: 'Billetera', action: 'Cargar saldo', tone: 'wallet' },
    loader: () => import('./tutorials/WalletTutorial').then((module) => module.walletSteps),
  },
  {
    key: 'withdraw',
    title: 'Cómo retirar saldo',
    description: 'Retira tus ganancias a tu cuenta bancaria.',
    stepCount: 2,
    preview: { eyebrow: 'Billetera', action: 'Confirmar retiro', tone: 'wallet' },
    loader: () => import('./tutorials/WithdrawTutorial').then((module) => module.withdrawSteps),
  },
  {
    key: 'transfer',
    title: 'Cómo transferir saldo',
    description: 'Envía fichas a otros jugadores.',
    stepCount: 5,
    preview: { eyebrow: 'Transferencia', action: 'Buscar destinatario', tone: 'wallet' },
    loader: () => import('./tutorials/TransferTutorial').then((module) => module.transferSteps),
  },
  {
    key: 'first-game',
    title: 'Cómo jugar tu primera partida',
    description: 'Únete a una mesa y empieza a jugar.',
    stepCount: 4,
    preview: { eyebrow: 'Mesa en vivo', action: 'Entrar a mesa', tone: 'game' },
    loader: () => import('./tutorials/FirstGameTutorial').then((module) => module.firstGameSteps),
  },
  {
    key: 'game-menu',
    title: 'Funciones del menú de mesa',
    description: 'Audio, reglas, admin, transferir y salir.',
    stepCount: 4,
    preview: { eyebrow: 'Opciones de mesa', action: 'Abrir menú', tone: 'game' },
    loader: () => import('./tutorials/GameMenuTutorial').then((module) => module.gameMenuSteps),
  },
  {
    key: 'friends',
    title: 'Amigos',
    description: 'Agrega, elimina, invita y chatea con amigos.',
    stepCount: 5,
    preview: { eyebrow: 'Social club', action: 'Agregar amigo', tone: 'social' },
    loader: () => import('./tutorials/FriendsTutorial').then((module) => module.friendsSteps),
  },
] as const satisfies readonly TutorialDefinition[]

export type TutorialKey = (typeof TUTORIAL_CATALOG)[number]['key']

export function getTutorialDefinition(key: TutorialKey): TutorialDefinition {
  const tutorial = TUTORIAL_CATALOG.find((item) => item.key === key)

  if (!tutorial) {
    throw new Error(`Tutorial desconocido: ${key}`)
  }

  return tutorial
}
