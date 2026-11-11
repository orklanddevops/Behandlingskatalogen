/** @jest-environment jsdom */
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { getAllCodelists } from '../../api/CodelistApi'
import OrganisationPage from '../../components/mainPages/OrganisationPage'
import { EListName, IAllCodelists } from '../../constants/codelistConstant'

jest.mock('../../api/CodelistApi', () => ({ getAllCodelists: jest.fn() }))

const data: IAllCodelists = {
  codelist: {
    DEPARTMENT: [
      { list: EListName.DEPARTMENT, code: 'HELSE', shortName: 'Helse', description: 'Omsorg' },
      { list: EListName.DEPARTMENT, code: 'IT', shortName: 'IT', description: 'Digitalisering' },
      {
        list: EListName.DEPARTMENT,
        code: 'OLD',
        shortName: 'Utgått',
        description: '',
        invalidCode: true,
      },
    ],
    SEKSJON: [{ list: EListName.SEKSJON, code: 'HR', shortName: 'Personal', description: '' }],
  },
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(getAllCodelists).mockResolvedValue(data)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => root.render(<OrganisationPage />))
}

async function click(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) =>
    item.textContent?.includes(text)
  )!
  expect(button).toBeDefined()
  await act(async () => button.click())
}

test('shows organisation levels with counts, excluding retired codes and without inventing parent relationships', async () => {
  await render()
  expect(getAllCodelists).toHaveBeenCalledWith(true)
  expect(container.textContent).toContain('Enheter (2)')
  expect(container.textContent).toContain('Avdelinger (1)')
  expect(container.textContent).not.toContain('Utgått')
  expect(container.textContent).toContain('separate lister')
  await click('Avdelinger (1)')
  expect(container.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toContain(
    'Personal'
  )
})

test('searches names, codes and descriptions and handles no matches', async () => {
  await render()
  const input = container.querySelector('input')!
  for (const query of ['helse', 'IT', 'digitalisering', 'finnes ikke']) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, query)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const panel = container.querySelector('[role="tabpanel"]:not([hidden])')!
    expect(panel.textContent).toContain(query === 'finnes ikke' ? 'Ingen treff' : 'Viser 1 av 2')
  }
})

test('keeps the previous overview after a refresh failure and allows retrying', async () => {
  await render()
  jest.mocked(getAllCodelists).mockRejectedValueOnce(new Error('Network error'))
  await click('Oppdater oversikten')
  expect(container.textContent).toContain('Den sist hentede oversikten vises fortsatt')
  expect(container.textContent).toContain('Helse')
  await click('Prøv igjen')
  expect(getAllCodelists).toHaveBeenCalledTimes(3)
  expect(container.textContent).not.toContain('Kunne ikke hente')
})

test('offers a retry after the initial request fails', async () => {
  jest.mocked(getAllCodelists).mockRejectedValueOnce(new Error('Network error'))
  await render()
  expect(container.textContent).toContain('Kunne ikke hente')
  expect(container.querySelector('table')).toBeNull()
  await click('Prøv igjen')
  expect(container.textContent).toContain('Helse')
})
