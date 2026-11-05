/** @jest-environment jsdom */
import { Formik } from 'formik'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import QualitySystemDocuments from '@/components/Process/common/QualitySystemDocuments'
import { IProcessFormValues } from '@/constants'
import { EListName } from '@/constants/codelistConstant'
import { ICodelistProps } from '@/provider/kodeverkProvider'

let container: HTMLDivElement
let root: Root
const utils = {
  getParsedOptions: jest.fn(() => [{ id: 'LOCAL', label: 'Lokal vurdering' }]),
  getShortname: (_list: EListName, code: string) => (code === 'LOCAL' ? 'Lokal vurdering' : code),
} as unknown as ICodelistProps

beforeEach(async () => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root.render(
      <Formik
        initialValues={{ qualitySystemLinks: { documents: [] } } as unknown as IProcessFormValues}
        onSubmit={() => {}}
      >
        {(formik) => (
          <>
            <QualitySystemDocuments formikBag={formik} codelistUtils={utils} />
            <output>{JSON.stringify(formik.values.qualitySystemLinks)}</output>
          </>
        )}
      </Formik>
    )
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
const click = async (label: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (node) => node.textContent === label
  )!
  await act(async () => button.click())
}
const fill = async () => {
  const select = container.querySelector('select')!
  await act(async () => {
    select.value = 'LOCAL'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  for (const [index, value] of ['  Min vurdering  ', 'https://example.org/assessment'].entries()) {
    const input = container.querySelectorAll('input')[index]
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
}

test('starts with an add button and uses configured types when expanded', async () => {
  expect(container.querySelector('input')).toBeNull()
  expect(container.querySelector('select')).toBeNull()
  await click('Legg til')
  expect(container.textContent).toContain('Dokumentnavn')
  expect(container.querySelector('select')!.textContent).toContain('Lokal vurdering')
  expect(utils.getParsedOptions).toHaveBeenCalledWith(EListName.INFORMASJONSIKKERHET_CATEGORY)
  await click('Avbryt')
  expect(container.querySelector('input')).toBeNull()
  expect(JSON.parse(container.querySelector('output')!.textContent!)).toEqual({ documents: [] })
})

test('validates before adding and supports multiple documents and removal', async () => {
  for (let i = 0; i < 2; i++) {
    await click('Legg til')
    await click('Legg til')
    expect(container.textContent).toContain('Velg type')
    expect(JSON.parse(container.querySelector('output')!.textContent!).documents).toHaveLength(i)
    await fill()
    await click('Legg til')
  }
  const saved = JSON.parse(container.querySelector('output')!.textContent!).documents
  expect(saved).toHaveLength(2)
  expect(saved[0]).toEqual({
    type: 'LOCAL',
    name: 'Min vurdering',
    url: 'https://example.org/assessment',
  })
  expect(container.querySelector('input')).toBeNull()
  await click('Fjern')
  expect(JSON.parse(container.querySelector('output')!.textContent!).documents).toHaveLength(1)
})
