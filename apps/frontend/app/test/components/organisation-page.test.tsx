/** @jest-environment jsdom */
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import {
  IOrganisationChartStatus,
  getOrganisationChart,
  refreshOrganisationChart,
} from '../../api/OrganisationApi'
import OrganisationPage from '../../components/mainPages/OrganisationPage'
import { IUserContext, UserContext } from '../../provider/userProvider'

jest.mock('../../api/OrganisationApi', () => ({
  getOrganisationChart: jest.fn(),
  refreshOrganisationChart: jest.fn(),
}))

const data: IOrganisationChartStatus = {
  syncEnabled: true,
  chart: {
    organizationNumber: 'NO000000000',
    retrievedAt: '2026-11-11T03:00:00Z',
    lastAttemptAt: '2026-11-11T03:00:00Z',
    lastError: null,
    units: [
      { id: '1', parentId: null, name: 'Kommunen', managerName: '' },
      { id: '2', parentId: '1', name: 'Helse', managerName: 'Leder Eksempel' },
      { id: '3', parentId: '2', name: 'Legevakt', managerName: '' },
      { id: '4', parentId: '1', name: 'IT', managerName: '' },
    ],
  },
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(getOrganisationChart).mockResolvedValue(data)
  jest.mocked(refreshOrganisationChart).mockResolvedValue(data)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
async function render(admin = false) {
  await act(async () =>
    root.render(
      <UserContext.Provider value={{ isAdmin: () => admin } as IUserContext}>
        <OrganisationPage />
      </UserContext.Provider>
    )
  )
}
async function click(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) =>
    item.textContent?.includes(text)
  )!
  expect(button).toBeDefined()
  await act(async () => button.click())
}
async function search(value: string) {
  const input = container.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
test('reads the cached chart, expands the hierarchy, and reloads without calling eADM', async () => {
  await render()
  expect(container.textContent).toContain('Sist oppdatert fra eADM')
  expect(container.textContent).toContain('4 avdelinger')
  expect(container.textContent).not.toContain('Legevakt')
  await click('Kommunen')
  await click('Helse')
  expect(container.textContent).toContain('Legevakt')
  await click('Last inn oversikten')
  expect(getOrganisationChart).toHaveBeenCalledTimes(2)
  expect(refreshOrganisationChart).not.toHaveBeenCalled()
  expect(container.textContent).not.toContain('Hent på nytt fra eADM')
})
test('searches department numbers, names and managers while keeping parents visible', async () => {
  await render()
  await search('legevakt')
  expect(container.textContent).toContain('Kommunen')
  expect(container.textContent).toContain('Helse')
  expect(container.textContent).toContain('Legevakt')
  expect(container.textContent).not.toContain('Avdelingsnummer: 4')
  await search('Leder Eksempel')
  expect(container.textContent).toContain('1 treff i 4 avdelinger')
  await search('4')
  expect(container.textContent).toContain('Avdelingsnummer: 4')
  await search('ukjent')
  expect(container.textContent).toContain('Ingen treff')
})
test('retains the cached chart if an administrator refresh fails', async () => {
  jest.mocked(refreshOrganisationChart).mockRejectedValueOnce(new Error('eADM unavailable'))
  await render(true)
  await click('Hent på nytt fra eADM')
  expect(refreshOrganisationChart).toHaveBeenCalledTimes(1)
  expect(container.textContent).toContain('sist lagrede organisasjonskartet beholdes')
  expect(container.textContent).toContain('Kommunen')
})
test('allows retrying a failed cached read', async () => {
  jest.mocked(getOrganisationChart).mockRejectedValueOnce(new Error('Network'))
  await render()
  expect(container.textContent).toContain('Kunne ikke hente')
  await click('Prøv igjen')
  expect(container.textContent).toContain('Kommunen')
  expect(refreshOrganisationChart).not.toHaveBeenCalled()
})
test('shows an empty state and persisted sync failure', async () => {
  jest.mocked(getOrganisationChart).mockResolvedValueOnce({
    syncEnabled: true,
    chart: { ...data.chart, retrievedAt: null, units: [], lastError: 'Import mislyktes' },
  })
  await render()
  expect(container.textContent).toContain('ikke hentet ennå')
  expect(container.textContent).toContain('Ingen lagret organisasjonsstruktur')
  expect(container.textContent).toContain('Import mislyktes')
})
