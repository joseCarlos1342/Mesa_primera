import { fireEvent, render, screen } from '@testing-library/react'
import { friendsSteps } from '../FriendsTutorial'

describe('friendsSteps', () => {
  it('expone las cinco guías sociales esperadas', () => {
    expect(friendsSteps.map(({ label }) => label)).toEqual([
      'Tu lista de amigos y solicitudes',
      'Busca y añade nuevos amigos',
      'Chat directo en tiempo real',
      'Invita a jugar una partida',
      'Eliminar un amigo',
    ])
  })

  it('alterna entre amigos y solicitudes', () => {
    render(friendsSteps[0].screen)

    expect(screen.getByText('Carlos')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Solicitudes'))
    expect(screen.getByText('AnaGamer')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Mis Amigos/))
    expect(screen.getByText('Pedro')).toBeInTheDocument()
  })

  it('renderiza los contenidos de búsqueda, chat, invitación y eliminación', () => {
    render(
      <>
        {friendsSteps.slice(1).map(({ label, screen: step }) => <section key={label}>{step}</section>)}
      </>,
    )

    expect(screen.getByText('Añadir Amigo')).toBeInTheDocument()
    expect(screen.getByText('¿Jugamos una partida hoy?')).toBeInTheDocument()
    expect(screen.getByText('ENVIAR INVITACIÓN')).toBeInTheDocument()
    expect(screen.getByText('Sí, Eliminar')).toBeInTheDocument()
  })
})
