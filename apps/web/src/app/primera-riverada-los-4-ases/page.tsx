import { permanentRedirect } from 'next/navigation'

export const metadata = {
  robots: { index: false },
}

export default function BrandSeoLandingPage() {
  permanentRedirect('/')
}
