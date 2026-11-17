/** @jest-environment jsdom */
import axios from 'axios'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import AccessFeedback from '../../components/common/AccessFeedback'
import { IUserContext, UserContext } from '../../provider/userProvider'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
})
async function render(loggedIn: boolean) {
  await act(async () =>
    root.render(
      <UserContext.Provider
        value={{ isLoaded: () => true, isLoggedIn: () => loggedIn } as IUserContext}
      >
        <AccessFeedback />
      </UserContext.Provider>
    )
  )
}
test('logged-out users see an explicit warning and sign-in link instead of unexplained empty searches', async () => {
  await render(false)
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Du er ikke logget inn')
  expect(container.querySelector('a')?.getAttribute('href')).toContain('/login?redirect_uri=')
})
test('an expired session produces a sign-in message even when the initial user context was logged in', async () => {
  await render(true)
  expect(container.querySelector('[role="alert"]')).toBeNull()
  await act(async () => {
    await axios
      .get('/test', {
        adapter: async () => {
          throw new axios.AxiosError('unauthorized', undefined, undefined, undefined, {
            status: 401,
          } as any)
        },
      })
      .catch(() => {})
  })
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('økten din har utløpt')
  expect(container.querySelector('a')).not.toBeNull()
})
test('forbidden requests explain missing permissions', async () => {
  await render(true)
  await act(async () => {
    await axios
      .get('/test', {
        adapter: async () => {
          throw new axios.AxiosError('forbidden', undefined, undefined, undefined, {
            status: 403,
          } as any)
        },
      })
      .catch(() => {})
  })
  expect(container.textContent).toContain('Du har ikke tilgang')
  expect(container.querySelector('a')).toBeNull()
})
