import { notFound } from 'next/navigation'
import { DemoTablePreview } from './table-preview'

export default function DemoTablePage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <DemoTablePreview />
}
