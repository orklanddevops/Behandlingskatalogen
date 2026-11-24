/** @jest-environment jsdom */
import { Formik } from 'formik'
import { act } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { getAllCodelists, getAllCountries, getCountriesOutsideEUEEA } from '../../api/CodelistApi'
import FieldCountries from '../../components/Processor/components/FieldCountries'
import { IProcessorFormValues } from '../../constants'
import { CodelistContext, CodelistProvider } from '../../provider/kodeverkProvider'

jest.mock('../../api/CodelistApi')
let container: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.mocked(getAllCodelists).mockResolvedValue({ codelist: {} })
  const countries = [
    { code: 'USA', description: 'USA', validFrom: '', validTo: '' },
    { code: 'GBR', description: 'Storbritannia', validFrom: '', validTo: '' },
  ]
  jest.mocked(getAllCountries).mockResolvedValue(countries)
  jest.mocked(getCountriesOutsideEUEEA).mockResolvedValue(countries)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
test('loads countries and supports multiple selections and removal without empty entries', async () => {
  const initialValues: IProcessorFormValues = {
    name: 'Example',
    countries: [],
    operationalContractManagers: [],
  }
  await act(async () =>
    root.render(
      <CodelistProvider>
        <CodelistContext.Consumer>
          {({ utils }) => (
            <>
              <div id='code-categories'>
                {utils
                  .makeIdLabelForAllCodeLists()
                  .map((list) => list.id)
                  .join(',')}
              </div>
              <Formik initialValues={initialValues} onSubmit={jest.fn()}>
                {(formikBag) => (
                  <>
                    <FieldCountries formikBag={formikBag} />
                    <output>{JSON.stringify(formikBag.values.countries)}</output>
                  </>
                )}
              </Formik>
            </>
          )}
        </CodelistContext.Consumer>
      </CodelistProvider>
    )
  )
  expect(container.querySelector('#code-categories')?.textContent).not.toContain('DATA_PROCESSOR')
  const select = container.querySelector('select')!
  expect(Array.from(select.options).map((option) => option.value)).toEqual(['', 'GBR', 'USA'])
  async function choose(code: string) {
    await act(async () => {
      select.value = code
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  await choose('USA')
  expect(select.value).toBe('')
  expect(container.querySelector('output')?.textContent).toBe('["USA"]')
  await choose('')
  expect(container.querySelector('output')?.textContent).toBe('["USA"]')
  await choose('GBR')
  expect(container.querySelector('output')?.textContent).toBe('["USA","GBR"]')
  expect(select.options.length).toBe(1)
  await act(async () => container.querySelector('button')!.click())
  expect(container.querySelector('output')?.textContent).toBe('["GBR"]')
  expect(Array.from(select.options).map((option) => option.value)).toContain('USA')
})
