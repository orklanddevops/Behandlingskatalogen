/** @jest-environment jsdom */
import { Formik } from 'formik'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { getAvdelingOptions, getSeksjonOptions } from '../../api/NomApi'
import FieldDepartment from '../../components/Process/common/FieldDepartment'
import OrganisationSelect from '../../components/common/OrganisationSelect'

jest.mock('../../api/NomApi', () => ({
  getAvdelingOptions: jest.fn(),
  getSeksjonOptions: jest.fn(),
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

test('selects multiple shared Avdelinger and retains them when Enhet changes', async () => {
  jest.mocked(getAvdelingOptions).mockResolvedValue([
    { value: 'A', label: 'Enhet A' },
    { value: 'B', label: 'Enhet B' },
  ])
  jest.mocked(getSeksjonOptions).mockResolvedValue([
    { value: 'IT', label: 'IT' },
    { value: 'HR', label: 'HR' },
  ])
  await act(async () =>
    root.render(
      <Formik
        initialValues={{
          affiliation: { nomDepartmentId: 'A', nomDepartmentName: 'Enhet A', seksjoner: [] },
        }}
        onSubmit={() => {}}
      >
        {({ values }) => (
          <>
            <FieldDepartment />
            <output>{JSON.stringify(values)}</output>
          </>
        )}
      </Formik>
    )
  )
  await open('Velg avdeling')
  await choose('IT')
  await open('Velg avdeling')
  expect(
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.textContent)
  ).toEqual(['HR'])
  await choose('HR')
  await open('Velg enhet')
  await choose('Enhet B')
  const affiliation = JSON.parse(container.querySelector('output')!.textContent!).affiliation
  expect(affiliation.nomDepartmentId).toBe('B')
  expect(affiliation.seksjoner.map((s: { nomSeksjonId: string }) => s.nomSeksjonId)).toEqual([
    'IT',
    'HR',
  ])
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
