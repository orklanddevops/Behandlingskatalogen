/** @jest-environment jsdom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { LegalBasisView } from '../../components/common/LegalBasis'
import { ICodelistProps } from '../../provider/kodeverkProvider'

jest.mock('../../util/env', () => ({ env: {} }))

test('paragraph and chapter references link correctly when Beskrivelse contains a law summary', async () => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)
  const utils = {
    valid: () => true,
    getShortname: () => 'Mineralloven',
    getDescription: () => 'Regulerer leting, undersøkelser og utvinning av mineralressurser.',
  } as unknown as ICodelistProps
  try {
    await act(async () =>
      root.render(
        <LegalBasisView
          legalBasisForm={{
            gdpr: 'ART61E',
            nationalLaw: 'LOV_2025_06_20_107',
            description: '§ 1-1 og kapittel 2',
          }}
          codelistUtils={utils}
        />
      )
    )
    const links = Array.from(container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href')
    )
    expect(links).toEqual([
      'https://lovdata.no/lov/2025-06-20-107/§1-1',
      'https://lovdata.no/lov/2025-06-20-107/KAPITTEL_2',
    ])
  } finally {
    await act(async () => root.unmount())
  }
})
