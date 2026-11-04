import { MinusCircleIcon } from '@navikt/aksel-icons'
import { BodyShort, Button, Label, List, Loader, Modal, Tooltip } from '@navikt/ds-react'
import {
  ArrayHelpers,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  FieldProps,
  Form,
  Formik,
  FormikProps,
} from 'formik'
import { useContext, useEffect, useRef, useState } from 'react'
import { EListName, ICode } from '@/constants/codelistConstant'
import { CodelistContext } from '@/provider/kodeverkProvider'
import {
  getAll,
  getDefaultProcessDocument,
  getDocument,
  getDocumentByPageAndPageSize,
} from '../../../api/GetAllApi'
import {
  IAddDocumentToProcessFormValues,
  IDocument,
  IDocumentInfoTypeUse,
  IPolicy,
  IProcess,
} from '../../../constants'
import { disableEnter } from '../../../util/helper-functions'
import { Sensitivity } from '../../InformationType/Sensitivity'
import CustomSearchSelect from '../../common/AsyncSelectComponents'
import { Error, ModalLabel } from '../../common/ModalSchema'
import { addDocumentToProcessSchema } from '../../common/schemaValidation'

type TAddDocumentProps = {
  isOpen: boolean
  addDefaultDocument: boolean
  submit: (values: IAddDocumentToProcessFormValues) => void
  onClose: () => void
  process: IProcess
  error: string | null
}

interface IListInformationTypesProps {
  informationTypes: IDocumentInfoTypeUse[]
  formik: FormikProps<IAddDocumentToProcessFormValues>
  arrayHelpers: ArrayHelpers
}

const ListInformationTypes = (props: IListInformationTypesProps) => {
  const { informationTypes, formik, arrayHelpers } = props
  const { utils: codelistUtils } = useContext(CodelistContext)

  return (
    <List as='ul' className='w-full'>
      {informationTypes.map((informationType: IDocumentInfoTypeUse, index: number) => (
        <List.Item key={informationType.informationTypeId}>
          <div className='flex w-full justify-between'>
            <div className='flex justify-between w-[90%] items-center'>
              <div>
                <Sensitivity
                  sensitivity={informationType.informationType.sensitivity}
                  codelistUtils={codelistUtils}
                />
                &nbsp;
                {informationType.informationType.name}
              </div>
              <div className='opacity-80'>
                {informationType.subjectCategories
                  .map((subjectCategory: ICode) =>
                    codelistUtils.getShortname(EListName.SUBJECT_CATEGORY, subjectCategory.code)
                  )
                  .join(', ')}
              </div>
            </div>
            <Tooltip content='Fjern'>
              <Button
                size='small'
                variant='tertiary'
                type='button'
                onClick={() => {
                  const length = formik.values.informationTypes.length
                  arrayHelpers.remove(index)
                  if (length === 1) {
                    formik.setFieldValue('document', undefined)
                  }
                }}
              >
                {' '}
                <MinusCircleIcon aria-hidden className='block' />{' '}
              </Button>
            </Tooltip>
          </div>
        </List.Item>
      ))}
    </List>
  )
}

export const AddDocumentModal = (props: TAddDocumentProps) => {
  const { isOpen, submit, addDefaultDocument, process, error } = props
  const [defaultDoc, setDefaultDoc] = useState<IDocument | undefined>()
  const [loading, setLoading] = useState(true)
  const [defaultDocumentError, setDefaultDocumentError] = useState(false)

  const [documents, setDocuments] = useState<IDocument[]>([])
  const [documentsError, setDocumentsError] = useState(false)
  const [selectionError, setSelectionError] = useState(false)
  const [selectingDocument, setSelectingDocument] = useState(false)
  const selectionRequest = useRef(0)
  const documentOptions = documents.map((document) => ({
    ...document,
    value: document.id,
    label: document.name,
  }))
  const loadDocumentOptions = async (query: string) =>
    documentOptions.filter((document) =>
      document.name.toLocaleLowerCase('nb').includes(query.toLocaleLowerCase('nb'))
    )

  useEffect(() => {
    if (!isOpen) return
    let active = true
    ;(async () => {
      setDocuments([])
      setDocumentsError(false)
      setSelectionError(false)
      setSelectingDocument(false)
      try {
        const result = await getAll(getDocumentByPageAndPageSize)()
        if (!active) return
        setDocuments(
          result
            .filter((document) => document.informationTypes.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
        )
      } catch {
        if (active) setDocumentsError(true)
      }
    })()
    return () => {
      active = false
      selectionRequest.current += 1
    }
  }, [isOpen])

  useEffect(() => {
    ;(async () => {
      try {
        setDefaultDoc(await getDefaultProcessDocument())
      } catch {
        setDefaultDocumentError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onCloseModal = () => {
    props.onClose()
  }

  function extractInfoTypes(document: IDocument, existingPolicies: IPolicy[]) {
    const infoTypeUses = document.informationTypes
      .map((infoType) => {
        // remove subject categories already in use for this process
        const alreadyUsedSubjectCategoriies = existingPolicies
          .filter((policy) => policy.informationType.id === infoType.informationTypeId)
          .flatMap((policy) => policy.subjectCategories)
          .map((policy) => policy.code)
        const remainingSubjectCategories: ICode[] = infoType.subjectCategories.filter(
          (subjectCategory) => alreadyUsedSubjectCategoriies.indexOf(subjectCategory.code) < 0
        )

        return { ...infoType, subjectCategories: remainingSubjectCategories }
      })
      .filter((infoType) => !!infoType.subjectCategories.length) // remove infoTypes with no set subjectCategories
    infoTypeUses.sort((a, b) => a.informationType.name.localeCompare(b.informationType.name))
    return infoTypeUses
  }

  return (
    <Modal
      onClose={onCloseModal}
      open={isOpen}
      width='750px'
      header={{ heading: 'Legg til opplysningstyper fra dokument' }}
    >
      {loading && (
        <div className='flex w-full justify-center'>
          <Loader size='3xlarge' />
        </div>
      )}
      {isOpen && !loading && (
        <Formik
          onSubmit={submit}
          initialValues={
            {
              document: addDefaultDocument ? defaultDoc : undefined,
              informationTypes:
                addDefaultDocument && defaultDoc
                  ? extractInfoTypes(defaultDoc, process.policies)
                  : [],
              process: process,
              linkDocumentToPolicies: !addDefaultDocument,
            } as IAddDocumentToProcessFormValues
          }
          validationSchema={addDocumentToProcessSchema()}
        >
          {(formik: FormikProps<IAddDocumentToProcessFormValues>) => {
            const selectDocument = async (document: IDocument) => {
              const request = ++selectionRequest.current
              setSelectingDocument(true)
              setSelectionError(false)
              try {
                const fullDocument = await getDocument(document.id)
                if (request !== selectionRequest.current) return
                await formik.setValues({
                  ...formik.values,
                  document: fullDocument,
                  informationTypes: extractInfoTypes(fullDocument, process.policies),
                })
                formik.setFieldTouched('informationTypes', true, false)
              } catch {
                if (request === selectionRequest.current) setSelectionError(true)
              } finally {
                if (request === selectionRequest.current) setSelectingDocument(false)
              }
            }

            return (
              <Form onKeyDown={disableEnter}>
                <Modal.Body className='min-h-125'>
                  <div className='flex flex-col gap-4 px-8 py-4'>
                    {defaultDocumentError && (
                      <BodyShort>
                        Kunne ikke hente standarddokumentet. Du kan søke etter et dokument.
                      </BodyShort>
                    )}
                    <div className='flex flex-col gap-1'>
                      <Label size='small' htmlFor='add-document-picker'>
                        Dokument
                      </Label>
                      <Field name='document'>
                        {({}: FieldProps<IAddDocumentToProcessFormValues>) => (
                          <>
                            <CustomSearchSelect
                              ariaLabel='Søk dokumenter'
                              inputId='add-document-picker'
                              placeholder='Velg eller søk etter dokument'
                              defaultOptions={documentOptions}
                              noOptionsText={
                                documentsError
                                  ? 'Kunne ikke hente dokumenter. Lukk og prøv igjen.'
                                  : 'Ingen dokumenter funnet'
                              }
                              loadOptions={loadDocumentOptions}
                              onChange={(value: IDocument | undefined) => {
                                if (value) {
                                  selectDocument(value)
                                }
                              }}
                            />
                            {!formik.values.document && defaultDoc && (
                              <Button
                                type='button'
                                variant='secondary'
                                size='small'
                                className='mt-2 self-start'
                                onClick={() => selectDocument(defaultDoc)}
                              >
                                Standard opplysningstyper
                              </Button>
                            )}
                          </>
                        )}
                      </Field>
                      <Error fieldName='document' />
                      {selectionError && (
                        <BodyShort role='alert'>Kunne ikke hente dokumentet. Prøv igjen.</BodyShort>
                      )}
                      {selectingDocument && <Loader size='small' title='Henter dokument' />}
                    </div>

                    {!!formik.values.document && (
                      <div className='flex flex-col gap-2'>
                        <BodyShort weight='semibold'>{formik.values.document.name}</BodyShort>
                        {formik.values.document.description && (
                          <BodyShort className='text-gray-600'>
                            {formik.values.document.description}
                          </BodyShort>
                        )}
                        <div className='flex flex-col gap-1'>
                          <ModalLabel label='Opplysningstyper' />
                          <FieldArray name='informationTypes'>
                            {(arrayHelpers: FieldArrayRenderProps) => (
                              <ListInformationTypes
                                informationTypes={formik.values.informationTypes}
                                formik={formik}
                                arrayHelpers={arrayHelpers}
                              />
                            )}
                          </FieldArray>
                          <Error fieldName='informationTypes' />
                        </div>
                      </div>
                    )}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <div className='flex items-center justify-end gap-2'>
                    {error && <p className='text-red-600'>{error}</p>}
                    <Button type='button' variant='tertiary' onClick={onCloseModal}>
                      Avbryt
                    </Button>
                    <Button type='submit' disabled={selectingDocument}>
                      Legg til
                    </Button>
                  </div>
                </Modal.Footer>
              </Form>
            )
          }}
        </Formik>
      )}
    </Modal>
  )
}
