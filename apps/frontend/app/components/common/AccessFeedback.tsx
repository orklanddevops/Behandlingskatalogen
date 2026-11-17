'use client'

import { Alert, Link } from '@navikt/ds-react'
import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { UserContext } from '@/provider/userProvider'

export default function AccessFeedback() {
  const user = useContext(UserContext)
  const [status, setStatus] = useState<number | null>(null)
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
          setStatus(error.response!.status)
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [])
  const loggedOut = user.isLoaded() && !user.isLoggedIn()
  if (!loggedOut && status === null) return null
  const signIn = loggedOut || status === 401
  return (
    <Alert variant='warning' role='alert' className='mb-6'>
      {signIn
        ? 'Du er ikke logget inn, eller økten din har utløpt. Logg inn for å søke og se alle opplysninger.'
        : 'Du har ikke tilgang til disse opplysningene. Kontakt administrator hvis du trenger tilgang.'}
      {signIn && (
        <>
          {' '}
          <Link
            href={`/login?redirect_uri=${encodeURIComponent(typeof window === 'undefined' ? '' : window.location.href)}`}
          >
            Logg inn
          </Link>
        </>
      )}
    </Alert>
  )
}
