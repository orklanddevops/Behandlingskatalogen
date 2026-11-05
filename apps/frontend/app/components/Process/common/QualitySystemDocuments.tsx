import { Button, Link, Select, TextField } from '@navikt/ds-react'
import { FormikProps } from 'formik'
import { useState } from 'react'
import { IProcessFormValues } from '@/constants'
import { EListName } from '@/constants/codelistConstant'
import {
  TQualitySystemDocument,
  getQualitySystemDocuments,
  isQualitySystemUrl,
} from '@/constants/qualitySystemLinks'
import { ICodelistProps } from '@/provider/kodeverkProvider'

const emptyDocument: TQualitySystemDocument = { type: '', name: '', url: '' }

const QualitySystemDocuments = ({
  formikBag,
  codelistUtils,
}: {
  formikBag: FormikProps<IProcessFormValues>
  codelistUtils: ICodelistProps
}) => {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDocument)
  const [attempted, setAttempted] = useState(false)
  const documents = getQualitySystemDocuments(formikBag.values.qualitySystemLinks)
  const options = codelistUtils.getParsedOptions(EListName.INFORMASJONSIKKERHET_CATEGORY)
  const reset = () => {
    setOpen(false)
    setDraft(emptyDocument)
    setAttempted(false)
  }
  const updateDocuments = (next: TQualitySystemDocument[]) =>
    formikBag.setFieldValue('qualitySystemLinks', { documents: next })

  return (
    <div className='flex flex-col gap-4'>
      {documents.map((document, index) => (
        <div key={index} className='flex items-center justify-between gap-4 border-b pb-3'>
          <div>
            <div className='font-semibold'>
              {codelistUtils.getShortname(EListName.INFORMASJONSIKKERHET_CATEGORY, document.type)}
            </div>
            {isQualitySystemUrl(document.url) ? (
              <Link href={document.url} target='_blank' rel='noopener noreferrer'>
                {document.name}
              </Link>
            ) : (
              <span>{document.name}</span>
            )}
          </div>
          <Button
            type='button'
            variant='tertiary'
            size='small'
            aria-label={`Fjern ${document.name}`}
            onClick={() => updateDocuments(documents.filter((_, i) => i !== index))}
          >
            Fjern
          </Button>
        </div>
      ))}
      {!open ? (
        <Button
          type='button'
          variant='secondary'
          size='small'
          className='self-start'
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          Legg til
        </Button>
      ) : (
        <div className='flex flex-wrap items-start gap-3'>
          <Select
            label='Type'
            className='min-w-40 flex-1'
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            error={attempted && !draft.type ? 'Velg type' : undefined}
          >
            <option value=''>Velg type</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <TextField
            label='Dokumentnavn'
            placeholder='Dokumentnavn'
            className='min-w-40 flex-1'
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            error={attempted && !draft.name.trim() ? 'Skriv inn dokumentnavn' : undefined}
          />
          <TextField
            label='Lenke'
            type='url'
            placeholder='Lenke til dokument'
            className='min-w-40 flex-1'
            value={draft.url}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            error={
              attempted && !isQualitySystemUrl(draft.url.trim())
                ? 'Skriv inn en gyldig lenke som starter med https:// eller http://'
                : undefined
            }
          />
          <div className='flex flex-col gap-2 pt-7'>
            <Button type='button' variant='secondary' size='small' onClick={reset}>
              Avbryt
            </Button>
            <Button
              type='button'
              size='small'
              onClick={() => {
                setAttempted(true)
                if (!draft.type || !draft.name.trim() || !isQualitySystemUrl(draft.url.trim()))
                  return
                updateDocuments([
                  ...documents,
                  { ...draft, name: draft.name.trim(), url: draft.url.trim() },
                ])
                reset()
              }}
            >
              Legg til
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QualitySystemDocuments
