import { fireEvent, render, screen } from '@testing-library/react'

import { SupportTrigger } from '../SupportTrigger'

describe('SupportTrigger', () => {
  it('renderiza el botón base de soporte', () => {
    render(<SupportTrigger />)

    expect(screen.getByRole('button', { name: 'Soporte' })).toBeInTheDocument()
    expect(screen.queryByTestId('support-dot')).not.toBeInTheDocument()
  })

  it('muestra indicador cuando llega support-notification y lo limpia al abrir el chat', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<SupportTrigger />)

    fireEvent(window, new Event('support-notification'))

    expect(screen.getByTestId('support-dot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Soporte, mensaje nuevo' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Soporte, mensaje nuevo' }))

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-support-chat' }))
    expect(screen.queryByTestId('support-dot')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Soporte' })).toBeInTheDocument()
  })
})
