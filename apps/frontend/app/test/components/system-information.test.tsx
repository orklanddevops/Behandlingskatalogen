/** @jest-environment jsdom */
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { getAllProcessors } from '../../api/ProcessorApi'
import {
  ISystemInformation,
  getSystemInformation,
  saveSystemInformation,
} from '../../api/SystemInformationApi'
import { getAllTeams, searchResourceByName } from '../../api/TeamApi'
import SystemInformationPanel from '../../components/SystemInformation/SystemInformationPanel'
import { TSystemSection } from '../../components/SystemInformation/SystemSectionFields'
import { EListName, IAllCodelists } from '../../constants/codelistConstant'
import { CodelistContext, ICodelistProps } from '../../provider/kodeverkProvider'
import { IUserContext, UserContext } from '../../provider/userProvider'

jest.mock('../../api/SystemInformationApi')
jest.mock('../../api/ProcessorApi')
jest.mock('../../api/TeamApi', () => ({ getAllTeams: jest.fn(), searchResourceByName: jest.fn() }))

const initial: ISystemInformation = {
  systemCode: 'SIGNINAPP',
  version: 1,
  updatedAt: null,
  updatedBy: null,
  data: {
    systemOwner: { id: 'owner', name: 'Ada Hansen', email: 'ada@example.org' },
    administrators: [],
    superUsers: [],
    organisationalUnit: 'Organisasjon',
    supportEmail: '',
    supportUrl: '',
    supportPhone: '+47 12345678',
    emergencyEmail: 'emergency@example.org',
    emergencyUrl: 'https://emergency.example.org',
    emergencyPhone: '+47 87654321',
    notes: 'Original note',
    lastVerifiedDate: null,
    lastVerifiedBy: null,
  },
}
let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(getSystemInformation).mockResolvedValue(JSON.parse(JSON.stringify(initial)))
  jest.mocked(getAllProcessors).mockResolvedValue([
    { id: 'supplier-1', name: 'Leverandør en' },
    { id: 'supplier-2', name: 'Leverandør to' },
  ] as any)
  jest.mocked(getAllTeams).mockResolvedValue([{ id: 'it', name: 'IT' } as any])
  jest.mocked(searchResourceByName).mockResolvedValue({
    content: [{ navIdent: 'new-owner', fullName: 'Kari Olsen', email: 'kari@example.org' }],
  } as any)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  jest.resetAllMocks()
})

async function render(writer = true, section: TSystemSection = 'responsibilities') {
  const user = {
    isLoaded: () => true,
    isLoggedIn: () => true,
    canWrite: () => writer,
  } as IUserContext
  await act(async () =>
    root.render(
      <UserContext.Provider value={user}>
        <CodelistContext.Provider
          value={{
            utils: {
              getCodes: (list: EListName) =>
                list === EListName.DEPARTMENT
                  ? [{ list, code: 'IT_ENHET', shortName: 'IT-enheten', description: '' }]
                  : [],
            } as unknown as ICodelistProps,
            lists: {} as IAllCodelists,
            setLists: jest.fn(),
          }}
        >
          <SystemInformationPanel systemCode='SIGNINAPP' section={section} />
        </CodelistContext.Provider>
      </UserContext.Provider>
    )
  )
}
async function click(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (node) => node.textContent === text
  )!
  expect(button).toBeDefined()
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}
async function setNotes(value: string) {
  const textarea = container.querySelector('textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      textarea,
      value
    )
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  )
}

test('shows saved responsibilities to a reader without an edit action', async () => {
  await render(false)
  expect(container.textContent).toContain('Ada Hansen')
  expect(container.querySelector('a[href="mailto:ada@example.org"]')).not.toBeNull()
  expect(container.textContent).not.toContain('Rediger systemansvar')
})

test('cancel discards unsaved changes and reopening restores the saved values', async () => {
  await render()
  await click('Rediger systemansvar')
  await setNotes('Unsaved note')
  await click('Avbryt')
  expect(container.textContent).toContain('Original note')
  expect(saveSystemInformation).not.toHaveBeenCalled()
  await click('Rediger systemansvar')
  expect(container.querySelector('textarea')!.value).toBe('Original note')
})

test('failed saves keep the draft and allow retrying', async () => {
  jest.mocked(saveSystemInformation).mockRejectedValueOnce(new Error('offline'))
  await render()
  await click('Rediger systemansvar')
  await setNotes('Keep this draft')
  await submit()
  expect(container.textContent).toContain('Endringene dine er beholdt')
  expect(container.querySelector('textarea')!.value).toBe('Keep this draft')
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false)
})

test('selects an employee from directory results and saves the selected identity', async () => {
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => ({ ...info, version: 2 }))
  await render()
  await click('Rediger systemansvar')
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Systemeier"]')!
  await act(async () => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Kari')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(searchResourceByName).toHaveBeenCalledWith('Kari')
  const choice = Array.from(document.querySelectorAll('[role="option"]')).find((node) =>
    node.textContent?.includes('Kari Olsen')
  )!
  expect(choice).toBeDefined()
  await act(async () => choice.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await setNotes('Updated note')
  await submit()
  expect(saveSystemInformation).toHaveBeenCalledWith(
    expect.objectContaining({
      version: 1,
      data: expect.objectContaining({
        systemOwner: { id: 'new-owner', name: 'Kari Olsen', email: 'kari@example.org' },
        notes: 'Updated note',
      }),
    }),
    false
  )
  expect(container.textContent).toContain('Systeminformasjonen er lagret')
  expect(container.textContent).toContain('Kari Olsen')
  expect(container.querySelector('form')).toBeNull()
})

test('shows support phone and emergency contacts and does not fetch Entra teams', async () => {
  await render()
  expect(container.querySelector('a[href="tel:+4712345678"]')).not.toBeNull()
  expect(container.querySelector('a[href="mailto:emergency@example.org"]')).not.toBeNull()
  expect(container.querySelector('a[href="https://emergency.example.org"]')).not.toBeNull()
  expect(container.querySelector('a[href="tel:+4787654321"]')).not.toBeNull()
  await click('Rediger systemansvar')
  expect(container.querySelector('input[aria-label="Ansvarlig enhet"]')).not.toBeNull()
  expect(container.textContent).not.toContain('Ansvarlig team')
  expect(container.querySelectorAll('input[type="tel"]')).toHaveLength(2)
  expect(getAllTeams).not.toHaveBeenCalled()
})

test('selects a unit from kodeverk and saves its code with the contact fields', async () => {
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => ({ ...info, version: 2 }))
  await render()
  await click('Rediger systemansvar')
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Ansvarlig enhet"]')!
  await act(async () => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'IT-enheten'
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const choice = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent === 'IT-enheten'
  )!
  expect(choice).toBeDefined()
  await act(async () => choice.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await submit()
  expect(saveSystemInformation).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        organisationalUnit: 'IT_ENHET',
        supportPhone: '+47 12345678',
        emergencyEmail: 'emergency@example.org',
        emergencyUrl: 'https://emergency.example.org',
        emergencyPhone: '+47 87654321',
      }),
    }),
    false
  )
  expect(container.textContent).toContain('IT-enheten')
  expect(getAllTeams).not.toHaveBeenCalled()
})

async function changeValue(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!
  expect(input).not.toBeNull()
  await act(async () => {
    const prototype =
      input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(
      new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })
    )
  })
}
async function radio(value: string) {
  await act(async () =>
    container.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!.click()
  )
}

test('technical information saves zero users and the selected criticality without losing responsibilities', async () => {
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => ({ ...info, version: 2 }))
  await render(true, 'technical')
  await click('Rediger systeminformasjon')
  expect(container.querySelector('input[aria-label="Teknisk drifter"]')).not.toBeNull()
  await changeValue('input[type="number"]', '0')
  await changeValue('#system-criticality', 'HIGH')
  await submit()
  expect(saveSystemInformation).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        systemOwner: initial.data.systemOwner,
        technical: { technicalOperator: null, userCount: 0, criticality: 'HIGH' },
      }),
    }),
    false
  )
  expect(container.textContent).toContain('Høy')
})

test('economy saves zero cost and a purchase date and preserves other tabs', async () => {
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => ({ ...info, version: 2 }))
  await render(true, 'economy')
  await click('Rediger økonomi')
  await changeValue('input[type="number"]', '0')
  await changeValue('input[type="url"]', 'https://example.org/agreement')
  await changeValue('input[type="date"]', '2026-11-17')
  await submit()
  expect(saveSystemInformation).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        notes: initial.data.notes,
        economy: expect.objectContaining({
          annualCost: '0',
          purchaseDate: '2026-11-17',
          agreementUrl: 'https://example.org/agreement',
        }),
      }),
    }),
    false
  )
  expect(container.querySelector('a[href="https://example.org/agreement"]')).not.toBeNull()
})

test('checklists follow solution type and retain independent answers when switching and skipping', async () => {
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => ({ ...info, version: 2 }))
  await render(true, 'accessibility')
  await click('Rediger tilgjengelighetserklæring')
  await radio('RELEVANT')
  await submit()
  expect(saveSystemInformation).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Velg nettløsning eller app')
  await radio('web')
  expect(container.querySelectorAll('select')).toHaveLength(48)
  await changeValue('select', 'YES')
  await radio('app')
  expect(container.querySelectorAll('select')).toHaveLength(42)
  expect(container.querySelector('select')!.value).toBe('NOT_CHECKED')
  await changeValue('select', 'NO')
  await radio('web')
  expect(container.querySelector('select')!.value).toBe('YES')
  await radio('NOT_RELEVANT')
  expect(container.querySelectorAll('select')).toHaveLength(0)
  await submit()
  expect(saveSystemInformation).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        accessibility: {
          relevance: 'NOT_RELEVANT',
          solutionType: 'web',
          webAnswers: { '1.1.1': 'YES' },
          appAnswers: { '1.1.1': 'NO' },
        },
      }),
    }),
    false
  )
})

test('technical information supports several suppliers and system documents', async () => {
  await render(true, 'technical')
  await click('Rediger systeminformasjon')
  for (const id of ['supplier-1', 'supplier-2']) {
    await changeValue('#system-suppliers', id)
  }
  expect(container.querySelector('option[value="supplier-1"]')).toBeNull()
  expect(container.querySelector('a[href="/processor/supplier-1"]')?.textContent).toBe(
    'Leverandør en'
  )
  const options = Array.from(container.querySelectorAll('select')[1].options).map(
    (option) => option.value
  )
  expect(options).toEqual(['', 'HOVEDAVTALE', 'ANNEN_AVTALE', 'ROS'])
  await changeValue('#system-document-type', 'HOVEDAVTALE')
  await changeValue('input[placeholder="Dokumentnavn"]', 'Hovedavtale for systemet')
  await changeValue('input[placeholder="Lenke til dokument"]', 'https://example.org/agreement')
  await click('Legg til')
  jest.mocked(saveSystemInformation).mockImplementation(async (info) => info)
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  )
  expect(jest.mocked(saveSystemInformation).mock.calls[0][0].data).toMatchObject({
    supplierIds: ['supplier-1', 'supplier-2'],
    documents: [
      {
        type: 'HOVEDAVTALE',
        name: 'Hovedavtale for systemet',
        url: 'https://example.org/agreement',
      },
    ],
  })
})
