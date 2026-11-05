import { getQualitySystemDocuments, isQualitySystemUrl } from '@/constants/qualitySystemLinks'

describe('quality system documents', () => {
  it('preserves existing links as named documents when opening an older process', () => {
    expect(getQualitySystemDocuments({ dpia: 'https://example.org/dpia', ros: '' })).toEqual([
      { type: 'DPIA', name: 'DPIA', url: 'https://example.org/dpia' },
    ])
    expect(getQualitySystemDocuments()).toEqual([])
  })

  it('retains multiple documents of the same type', () => {
    const documents = [
      { type: 'DPIA', name: 'First', url: 'https://example.org/1' },
      { type: 'DPIA', name: 'Second', url: 'https://example.org/2' },
    ]
    expect(getQualitySystemDocuments({ documents })).toEqual(documents)
  })

  it('only accepts HTTP and HTTPS document links', () => {
    expect(isQualitySystemUrl('https://example.org')).toBe(true)
    expect(isQualitySystemUrl('http://example.org')).toBe(true)
    expect(isQualitySystemUrl('javascript:alert(1)')).toBe(false)
    expect(isQualitySystemUrl('not a url')).toBe(false)
  })
})
