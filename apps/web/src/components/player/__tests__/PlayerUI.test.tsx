import { fireEvent, render, screen } from '@testing-library/react'
import { Wallet } from 'lucide-react'

import {
  EmptyState,
  ListRow,
  Money,
  PageHeader,
  RowList,
  Section,
  SegmentedTabs,
  Skeleton,
  StatusTag,
  TextareaField,
  normalizeStatus,
} from '../PlayerUI'

describe('PageHeader', () => {
  it('renderiza título, lead, enlace de volver y acción', () => {
    render(
      <PageHeader
        title="Billetera"
        lead="Carga y retira"
        back={{ href: '/wallet', label: 'Volver' }}
        action={<button type="button">Acción</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Billetera' })).toBeInTheDocument()
    expect(screen.getByText('Carga y retira')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument()
  })

  it('omite lead, back y action cuando no se entregan', () => {
    render(<PageHeader title="Solo título" />)
    expect(screen.getByRole('heading', { name: 'Solo título' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('Section', () => {
  it('enlaza el título con aria-labelledby y muestra el aside', () => {
    render(
      <Section id="sec" title="Movimientos" aside={<span>Ver todo</span>}>
        <p>Contenido</p>
      </Section>,
    )
    const region = screen.getByRole('region', { name: 'Movimientos' })
    expect(region).toBeInTheDocument()
    expect(screen.getByText('Ver todo')).toBeInTheDocument()
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})

describe('ListRow', () => {
  it('renderiza como enlace con icono y chevron cuando hay href', () => {
    render(<ListRow icon={Wallet} title="Cargar" href="/wallet/deposit" ariaLabel="Cargar saldo" />)
    const link = screen.getByRole('link', { name: 'Cargar saldo' })
    expect(link).toHaveAttribute('href', '/wallet/deposit')
  })

  it('renderiza como botón cuando hay onClick y dispara el click', () => {
    const onClick = jest.fn()
    render(<ListRow icon={Wallet} title="Abrir" onClick={onClick} trailing={<span>$10</span>} />)
    fireEvent.click(screen.getByRole('button', { name: /abrir/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByText('$10')).toBeInTheDocument()
  })

  it('renderiza como div sin interacción y usa leading en vez de icono', () => {
    render(<ListRow leading={<span data-testid="avatar" />} title="Perfil" meta="Nivel 3" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3')).toBeInTheDocument()
  })

  it('oculta el chevron cuando chevron=false aunque haya href', () => {
    const { container } = render(<ListRow title="Sin flecha" href="/x" chevron={false} />)
    expect(container.querySelector('.lucide-chevron-right')).toBeNull()
  })
})

describe('RowList', () => {
  it('renderiza una lista con etiqueta accesible', () => {
    render(
      <RowList label="Movimientos">
        <li>Uno</li>
      </RowList>,
    )
    expect(screen.getByRole('list', { name: 'Movimientos' })).toBeInTheDocument()
  })
})

describe('Money', () => {
  it('antepone + verde para créditos', () => {
    render(<Money cents={50000} direction="credit" />)
    expect(screen.getByTestId('money')).toHaveTextContent('+$500')
  })

  it('antepone − para débitos (U+2212)', () => {
    render(<Money cents={50000} direction="debit" />)
    expect(screen.getByTestId('money')).toHaveTextContent('\u2212$500')
  })

  it('sin dirección no antepone signo y trata null como 0', () => {
    render(<Money cents={null} />)
    expect(screen.getByTestId('money')).toHaveTextContent('$0')
  })
})

describe('normalizeStatus y StatusTag', () => {
  it('normaliza los estados conocidos', () => {
    expect(normalizeStatus('completed')).toBe('completed')
    expect(normalizeStatus('approved')).toBe('completed')
    expect(normalizeStatus('pending')).toBe('pending')
    expect(normalizeStatus('processing')).toBe('pending')
    expect(normalizeStatus('rejected')).toBe('failed')
    expect(normalizeStatus(null)).toBe('failed')
    expect(normalizeStatus(undefined)).toBe('failed')
  })

  it('muestra las etiquetas por estado', () => {
    const { rerender } = render(<StatusTag status="completed" />)
    expect(screen.getByText('Completado')).toBeInTheDocument()
    rerender(<StatusTag status="pending" />)
    expect(screen.getByText('En revisión')).toBeInTheDocument()
    rerender(<StatusTag status="failed" />)
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
  })

  it('permite sobreescribir la etiqueta', () => {
    render(<StatusTag status="completed" label="OK" />)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renderiza título, texto y acción', () => {
    render(<EmptyState icon={Wallet} title="Sin movimientos" text="Aparecerán aquí" action={<button type="button">Cargar</button>} />)
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument()
    expect(screen.getByText('Aparecerán aquí')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar' })).toBeInTheDocument()
  })

  it('omite texto y acción opcionales', () => {
    render(<EmptyState icon={Wallet} title="Vacío" />)
    expect(screen.getByText('Vacío')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('TextareaField', () => {
  it('muestra el hint cuando no hay error', () => {
    render(<TextareaField label="Notas" hint="Opcional" value="" onChange={() => {}} />)
    expect(screen.getByText('Opcional')).toBeInTheDocument()
    expect(screen.getByLabelText('Notas')).not.toHaveAttribute('aria-invalid')
  })

  it('muestra el error y marca aria-invalid', () => {
    render(<TextareaField label="Notas" error="Muy largo" hint="Opcional" value="" onChange={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Muy largo')
    expect(screen.queryByText('Opcional')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Notas')).toHaveAttribute('aria-invalid', 'true')
  })

  it('usa el id entregado para enlazar label y campo', () => {
    render(<TextareaField id="obs" label="Observaciones" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Observaciones')).toHaveAttribute('id', 'obs')
  })
})

describe('SegmentedTabs', () => {
  const options = [
    { value: 'a', label: 'Uno' },
    { value: 'b', label: 'Dos', badge: 3 },
    { value: 'c', label: 'Tres' },
  ] as const

  it('marca la pestaña activa y responde al click', () => {
    const onChange = jest.fn()
    render(<SegmentedTabs label="Filtros" value="a" onChange={onChange} options={options} idPrefix="f" />)
    expect(screen.getByRole('tab', { name: /uno/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /dos/i }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('navega con flecha derecha e izquierda (con envoltura)', () => {
    const onChange = jest.fn()
    render(<SegmentedTabs label="Filtros" value="a" onChange={onChange} options={options} idPrefix="f" />)
    const firstTab = screen.getByRole('tab', { name: /uno/i })
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('b')
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('c')
  })

  it('ignora teclas distintas de las flechas', () => {
    const onChange = jest.fn()
    render(<SegmentedTabs label="Filtros" value="a" onChange={onChange} options={options} idPrefix="f" />)
    fireEvent.keyDown(screen.getByRole('tab', { name: /uno/i }), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Skeleton', () => {
  it('renderiza un bloque decorativo', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    const el = container.querySelector('span[aria-hidden="true"]')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('h-4', 'w-10')
  })
})
