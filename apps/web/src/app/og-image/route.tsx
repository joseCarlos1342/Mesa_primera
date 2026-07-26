export const runtime = 'edge'
export const revalidate = 31536000

export async function GET(request: Request) {
  return fetch(new URL('/og-image.png', request.url))
}
