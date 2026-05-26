import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { firstGameSteps } from '../FirstGameTutorial'
import { friendsSteps } from '../FriendsTutorial'
import { gameMenuSteps } from '../GameMenuTutorial'
import { installAppSteps } from '../InstallAppTutorial'
import { loginSteps } from '../LoginTutorial'
import { registerSteps } from '../RegisterTutorial'
import { transferSteps } from '../TransferTutorial'
import { walletSteps } from '../WalletTutorial'
import { withdrawSteps } from '../WithdrawTutorial'
import { MockPhoneFrame } from '../MockPhoneFrame'
import { TutorialPlayer } from '../TutorialPlayer'

const tutorials = [
  {
    name: 'instalacion',
    steps: installAppSteps,
    labels: [
      'Aparece el banner de instalación',
      'Chrome: los 3 puntos → Instalar app',
      'Android: confirma la instalación',
      'iOS: usa el menú de Safari',
      'App lista en tu pantalla de inicio',
    ],
  },
  {
    name: 'registro',
    steps: registerSteps,
    labels: [
      'Completa tus datos y elige tu avatar',
      'Verifica tu número con el código SMS',
      'Crea tu clave de acceso de 6 dígitos',
      'Activa la huella digital (opcional)',
    ],
  },
  {
    name: 'login',
    steps: loginSteps,
    labels: [
      'Ingresa tu teléfono y PIN',
      'O usa tu huella digital registrada',
      'Dispositivo nuevo: verifica con SMS',
      '¿Olvidaste tu clave? Recupérala por SMS',
    ],
  },
  {
    name: 'primera partida',
    steps: firstGameSteps,
    labels: [
      'Elige una mesa en el lobby',
      'Sala de espera: confirma que estás listo',
      'La mesa de juego: cartas, fichas y acciones',
      'Las fases del juego',
    ],
  },
  {
    name: 'menu de juego',
    steps: gameMenuSteps,
    labels: [
      'Carrito de recarga rápida',
      'Menú de opciones de mesa',
      'Llamar al Admin',
      'Abandonar partida',
    ],
  },
  {
    name: 'amigos',
    steps: friendsSteps,
    labels: [
      'Tu lista de amigos y solicitudes',
      'Busca y añade nuevos amigos',
      'Chat directo en tiempo real',
      'Invita a jugar una partida',
      'Eliminar un amigo',
    ],
  },
  {
    name: 'transferencias',
    steps: transferSteps,
    labels: [
      'Busca al jugador por teléfono',
      'Confirma el destinatario',
      'Ingresa el monto a transferir',
      'Revisa y confirma',
      'Transferencia completada',
    ],
  },
  {
    name: 'wallet',
    steps: walletSteps,
    labels: [
      'Tu billetera con balance y opciones',
      'Elige un monto y ve al depósito',
      'Deposita vía Nequi con comprobante',
      'Tu depósito está siendo procesado',
    ],
  },
  {
    name: 'retiros',
    steps: withdrawSteps,
    labels: [
      'Ingresa monto y datos bancarios',
      'Confirmar y esperar procesamiento',
    ],
  },
]

describe('landing tutorial steps', () => {
  it.each(tutorials)('define el flujo de $name con labels estables', ({ steps, labels }) => {
    expect(steps.map((step) => step.label)).toEqual(labels)
  })

  it.each(tutorials)('renderiza cada pantalla del tutorial $name con contenido visible', ({ steps }) => {
    for (const step of steps) {
      const { container } = render(step.screen)

      expect(container.textContent?.trim()).toBeTruthy()
      expect(container.textContent).not.toMatch(/undefined|null/)

      cleanup()
    }
  })

  it('MockPhoneFrame renderiza variantes portrait y landscape', () => {
    const { rerender, container } = render(
      <MockPhoneFrame>
        <p>Contenido portrait</p>
      </MockPhoneFrame>
    )

    expect(screen.getByText('Contenido portrait')).toBeInTheDocument()
    expect(container.innerHTML).toContain('aspect-[9/16]')

    rerender(
      <MockPhoneFrame landscape>
        <p>Contenido landscape</p>
      </MockPhoneFrame>
    )

    expect(screen.getByText('Contenido landscape')).toBeInTheDocument()
    expect(container.innerHTML).toContain('aspect-[16/9]')
  })

  it('TutorialPlayer navega entre pasos y bloquea extremos', () => {
    const onStepChange = jest.fn()
    const steps = [{ label: 'Primero' }, { label: 'Segundo' }, { label: 'Tercero' }]
    const { rerender } = render(
      <TutorialPlayer steps={steps} currentStep={0} onStepChange={onStepChange} />
    )

    expect(screen.getAllByText('Primero')).toHaveLength(2)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(onStepChange).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'Paso 3: Tercero' }))
    expect(onStepChange).toHaveBeenCalledWith(2)

    rerender(<TutorialPlayer steps={steps} currentStep={2} onStepChange={onStepChange} />)

    expect(screen.getAllByText('Tercero')).toHaveLength(2)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /completado/i })).toBeDisabled()
  })
})
