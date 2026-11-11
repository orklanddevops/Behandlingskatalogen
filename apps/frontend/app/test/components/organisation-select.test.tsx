/** @jest-environment jsdom */
import { Formik } from 'formik'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import FieldDepartment from '../../components/Process/common/FieldDepartment'
import FieldSubDepartments from '../../components/common/FieldSubDepartments'
import OrganisationSelect from '../../components/common/OrganisationSelect'
import { EListName, ICode } from '../../constants/codelistConstant'
import { CodelistContext, ICodelistProps } from '../../provider/kodeverkProvider'

jest.mock('../../api/NomApi', () => ({
  getAvdelingOptions: jest.fn(),
  getSeksjonOptions: jest.fn(),
  getFylkerOptions: jest.fn().mockResolvedValue([]),
}))

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function open(label: string) {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!
  expect(input).not.toBeNull()
  await act(async () => {
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  return input
}
async function choose(label: string) {
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (el) => el.textContent === label
  )!
  expect(option).toBeDefined()
  await act(async () => option.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

test('shows the full list without typing and filters two-character IT', async () => {
  const onChange = jest.fn()
  await act(async () =>
    root.render(
      <OrganisationSelect
        id='team'
        label='Velg team'
        options={[
          { value: 'IT', label: 'IT' },
          { value: 'HR', label: 'HR' },
        ]}
        onChange={onChange}
      />
    )
  )
  const input = await open('Velg team')
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent)
  ).toEqual(['IT', 'HR'])
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'IT')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent)
  ).toEqual(['IT'])
  await choose('IT')
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'IT' }), expect.anything())
})

const codes: ICode[] = [
  { list: EListName.DEPARTMENT, code: 'A', shortName: 'Enhet A', description: '', source: 'EADM' },
  { list: EListName.DEPARTMENT, code: 'B', shortName: 'Enhet B', description: '', source: 'EADM' },
  {
    list: EListName.SEKSJON,
    code: 'A1',
    shortName: 'Avdeling A1',
    description: '',
    parentCode: 'A',
    source: 'EADM',
  },
  {
    list: EListName.SEKSJON,
    code: 'A2',
    shortName: 'Avdeling A2',
    description: '',
    parentCode: 'A',
    source: 'EADM',
  },
  {
    list: EListName.SEKSJON,
    code: 'B1',
    shortName: 'Avdeling B1',
    description: '',
    parentCode: 'B',
    source: 'EADM',
  },
  {
    list: EListName.SUB_DEPARTMENT,
    code: 'S1',
    shortName: 'Under A1',
    description: '',
    parentCode: 'A1',
    source: 'EADM',
  },
  {
    list: EListName.SUB_DEPARTMENT,
    code: 'S2',
    shortName: 'Under A2',
    description: '',
    parentCode: 'A2',
    source: 'EADM',
  },
  {
    list: EListName.SUB_DEPARTMENT,
    code: 'SB',
    shortName: 'Under B1',
    description: '',
    parentCode: 'B1',
    source: 'EADM',
  },
]
const utils = {
  getCodes: (list: EListName) => codes.filter((code) => code.list === list),
  getShortname: (_: EListName, id: string) =>
    codes.find((code) => code.code === id)?.shortName ?? id,
} as ICodelistProps

async function renderFields() {
  await act(async () =>
    root.render(
      <CodelistContext.Provider value={{ utils, lists: { codelist: {} }, setLists: jest.fn() }}>
        <Formik
          initialValues={{
            affiliation: {
              nomDepartmentId: '',
              nomDepartmentName: '',
              seksjoner: [],
              subDepartments: [],
            },
          }}
          onSubmit={() => {}}
        >
          {(formik) => (
            <>
              <FieldDepartment />
              <FieldSubDepartments formikBag={formik as any} codelistUtils={utils} />
              <output>{JSON.stringify(formik.values.affiliation)}</output>
            </>
          )}
        </Formik>
      </CodelistContext.Provider>
    )
  )
}
const menuOptions = () =>
  Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent)
const affiliation = () => JSON.parse(container.querySelector('output')!.textContent!)

test('cascades enhet to avdelinger and narrows underavdelinger across multiple selected avdelinger', async () => {
  await renderFields()
  expect(
    container.querySelector('input[aria-label="Velg underavdeling"]')!.hasAttribute('disabled')
  ).toBe(false)
  await open('Velg enhet')
  await choose('Enhet A')
  await open('Velg avdeling')
  expect(menuOptions()).toEqual(['Avdeling A1', 'Avdeling A2'])
  await choose('Avdeling A1')
  await open('Velg underavdeling')
  expect(menuOptions()).toEqual(['Under A1'])
  await choose('Under A1')
  await open('Velg avdeling')
  await choose('Avdeling A2')
  await open('Velg underavdeling')
  expect(menuOptions()).toEqual(['Under A2'])
  await choose('Under A2')
  expect(affiliation().subDepartments).toEqual(['S1', 'S2'])
  const removeSection = Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes('Avdeling A1')
  )!
  await act(async () => removeSection.click())
  expect(
    affiliation().seksjoner.map((section: { nomSeksjonId: string }) => section.nomSeksjonId)
  ).toEqual(['A2'])
  expect(affiliation().subDepartments).toEqual(['S2'])
})

test('changing enhet drops unrelated child selections and immediately replaces the available branches', async () => {
  await renderFields()
  await open('Velg enhet')
  await choose('Enhet A')
  await open('Velg underavdeling')
  expect(menuOptions()).toEqual(['Under A1', 'Under A2'])
  await choose('Under A1')
  await open('Velg enhet')
  await choose('Enhet B')
  expect(affiliation().seksjoner).toEqual([])
  expect(affiliation().subDepartments).toEqual([])
  await open('Velg avdeling')
  expect(menuOptions()).toEqual(['Avdeling B1'])
  await choose('Avdeling B1')
  await open('Velg underavdeling')
  expect(menuOptions()).toEqual(['Under B1'])
})

test('keeps long lists scrollable and mounts the menu inside a form dialog', async () => {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  document.body.appendChild(dialog)
  dialog.appendChild(container)
  await act(async () =>
    root.render(
      <OrganisationSelect
        id='long-list'
        label='Velg team'
        options={Array.from({ length: 30 }, (_, i) => ({ value: String(i), label: `Team ${i}` }))}
        onChange={() => {}}
      />
    )
  )
  await open('Velg team')
  const menu = document.querySelector<HTMLElement>('[role="listbox"]')!
  expect(dialog.contains(menu)).toBe(true)
  expect(getComputedStyle(menu).maxHeight).toBe('240px')
  expect(getComputedStyle(menu).overflowY).toBe('auto')
  expect(menu.querySelectorAll('[role="option"]')).toHaveLength(30)
  dialog.remove()
})

test('all levels are available initially and selecting a child fills its parents', async () => {
  await renderFields()
  await open('Velg avdeling')
  expect(menuOptions()).toEqual(['Avdeling A1', 'Avdeling A2', 'Avdeling B1'])
  await choose('Avdeling B1')
  expect(affiliation().nomDepartmentId).toBe('B')

  await act(async () => root.unmount())
  root = createRoot(container)
  await renderFields()
  await open('Velg underavdeling')
  expect(menuOptions()).toEqual(['Under A1', 'Under A2', 'Under B1'])
  await choose('Under A1')
  expect(affiliation()).toEqual(
    expect.objectContaining({
      nomDepartmentId: 'A',
      nomDepartmentName: 'Enhet A',
      seksjoner: [{ nomSeksjonId: 'A1', nomSeksjonName: 'Avdeling A1' }],
      subDepartments: ['S1'],
    })
  )
})

test('clearing enhet clears its children and makes all branches selectable again', async () => {
  await renderFields()
  await open('Velg underavdeling')
  await choose('Under A1')
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Velg enhet"]')!
  await act(async () => {
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  })
  expect(affiliation()).toEqual(
    expect.objectContaining({
      nomDepartmentId: '',
      seksjoner: [],
      subDepartments: [],
    })
  )
  await open('Velg avdeling')
  expect(menuOptions()).toEqual(['Avdeling A1', 'Avdeling A2', 'Avdeling B1'])
})
