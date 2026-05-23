import { fireEvent, render, screen } from '@testing-library/react'

import { SupportTrigger } from '../SupportTrigger'

describe('SupportTrigger', () => {
  it('renderiza el botón base de soporte', () => {
    render(<SupportTrigger />)

    expect(screen.getByRole('button', { name: /soporte con el host/i })).toBeInTheDocument()
  })

  it('muestra indicador cuando llega support-notification y lo limpia al abrir el chat', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    render(<SupportTrigger />)

    fireEvent(window, new Event('support-notification'))
    expect(document.querySelector('.animate-bounce')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /soporte con el host/i }))

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-support-chat' }))
    expect(document.querySelector('.animate-bounce')).not.toBeInTheDocument()
  })
})
