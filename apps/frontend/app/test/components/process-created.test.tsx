/** @jest-environment jsdom */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { ProcessCreatedModal } from '../../components/Process/Accordion/ProcessCreatedModal'
import { useLocation } from '../../util/router'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))
let container: HTMLDivElement
let root: Root
const push = jest.fn()
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(usePathname).mockReturnValue('/process/purpose/HELSE/123')
  jest
    .mocked(useSearchParams)
    .mockReturnValue(new URLSearchParams('create=true&filter=COMPLETED') as any)
  jest.mocked(useRouter).mockReturnValue({ push } as any)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  jest.clearAllMocks()
})

test('creation prompt opens from the query string and continues to adding information types', async () => {
  const addPolicy = jest.fn()
  await act(async () =>
    root.render(<ProcessCreatedModal openAddPolicy={addPolicy} openAddDocument={jest.fn()} />)
  )
  const button = Array.from(document.querySelectorAll('button')).find(
    (node) => node.textContent === 'Legg til opplysningstyper enkeltvis'
  )!
  expect(button).toBeDefined()
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(addPolicy).toHaveBeenCalledTimes(1)
  expect(push).toHaveBeenCalledWith('/process/purpose/HELSE/123?filter=COMPLETED', {
    scroll: undefined,
  })
})

test('location preserves query parameters and browser fragments', async () => {
  window.history.replaceState({}, '', '/process/purpose/HELSE/123?create=true#details')
  function Probe() {
    return <div>{JSON.stringify(useLocation())}</div>
  }
  await act(async () => root.render(<Probe />))
  const location = JSON.parse(container.textContent || '{}')
  expect(location.search).toBe('?create=true&filter=COMPLETED')
  expect(location.hash).toBe('#details')
})

test('viewing an existing treatment with create=false does not open the creation prompt', async () => {
  jest.mocked(useSearchParams).mockReturnValue(new URLSearchParams('create=false') as any)
  await act(async () =>
    root.render(<ProcessCreatedModal openAddPolicy={jest.fn()} openAddDocument={jest.fn()} />)
  )
  expect(document.querySelector('dialog[open]')).toBeNull()
})
