import { headers } from 'next/headers'
import { FunctionComponent, ReactNode, Suspense } from 'react'
import './main.css'
import PageThemeWrapper from './pageThemeWrapper'
import { CodelistProvider } from './provider/kodeverkProvider'
import { UserProvider } from './provider/userProvider'

type TProps = {
  children: ReactNode
}

const Main: FunctionComponent<TProps> = async ({ children }) => {
  const requestHeaders = await headers()
  const host = requestHeaders.get('host') ?? ''
  const proto =
    requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const origin = host ? `${proto}://${host}` : undefined

  return (
    <html lang='nb'>
      <head>
        <link rel='icon' href='/orkland-kommune-logo-light.svg' type='image/svg+xml' />
        <link rel='manifest' href='/manifest.json' />
        <meta name='theme-color' content='#DDEBD7' />
        <meta charSet='utf-8' />
        <title>Behandlingskatalog – Orkland kommune</title>
        <meta
          name='description'
          content='Oversikt over behandling av personopplysninger i Orkland kommune.'
        />
      </head>
      <body>
        <UserProvider>
          <CodelistProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <PageThemeWrapper origin={origin}>{children}</PageThemeWrapper>
            </Suspense>
          </CodelistProvider>
        </UserProvider>
      </body>
    </html>
  )
}

export default Main
