'use client'

import {
  Alert,
  BodyShort,
  Heading,
  Label,
  Link,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Textarea,
} from '@navikt/ds-react'
import {
  ISystemAccessibility,
  ISystemInformationData,
  TChecklistAnswer,
} from '@/api/SystemInformationApi'
import checklists from '@/data/wcag-checklists.json'
import EmployeePicker from './EmployeePicker'

export type TSystemSection = 'responsibilities' | 'technical' | 'economy' | 'accessibility'
export const sectionTitles: Record<TSystemSection, string> = {
  responsibilities: 'Systemansvar',
  technical: 'Systeminformasjon',
  economy: 'Økonomi',
  accessibility: 'Tilgjengelighetserklæring',
}
const criticalities: Record<string, string> = {
  LOW: 'Lav',
  MEDIUM: 'Middels',
  HIGH: 'Høy',
  CRITICAL: 'Kritisk',
}
const answers: Record<TChecklistAnswer, string> = {
  YES: 'Ja',
  NO_CONTENT: 'Vi har ikke denne typen innhold',
  NO: 'Nei',
  NOT_CHECKED: 'Ikke sjekket',
}
export const emptyAccessibility: ISystemAccessibility = {
  relevance: 'UNSET',
  solutionType: 'UNSET',
  webAnswers: {},
  appAnswers: {},
}
type TChange = <K extends keyof ISystemInformationData>(
  key: K,
  value: ISystemInformationData[K]
) => void

export default function SystemSectionFields({
  section,
  data,
  onChange,
}: {
  section: TSystemSection
  data: ISystemInformationData
  onChange?: TChange
}) {
  const editing = !!onChange
  if (section === 'technical') {
    const value = data.technical ?? { technicalOperator: null, userCount: null, criticality: '' }
    return (
      <div className='space-y-6'>
        {editing ? (
          <EmployeePicker
            id='technical-operator'
            label='Teknisk drifter'
            value={value.technicalOperator ? [value.technicalOperator] : []}
            onChange={(people) =>
              onChange!('technical', { ...value, technicalOperator: people[0] ?? null })
            }
          />
        ) : (
          <div>
            <Heading size='small' level='3'>
              Teknisk drifter
            </Heading>
            <BodyShort>{value.technicalOperator?.name || 'Ikke registrert'}</BodyShort>
            {value.technicalOperator?.email && (
              <Link href={`mailto:${value.technicalOperator.email}`}>
                {value.technicalOperator.email}
              </Link>
            )}
          </div>
        )}
        {editing ? (
          <TextField
            label='Antall brukere'
            type='number'
            min={0}
            max={2147483647}
            step={1}
            value={value.userCount ?? ''}
            onChange={(event) =>
              onChange!('technical', {
                ...value,
                userCount: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        ) : (
          <div>
            <Heading size='small' level='3'>
              Antall brukere
            </Heading>
            <BodyShort>{value.userCount ?? 'Ikke registrert'}</BodyShort>
          </div>
        )}
        {editing ? (
          <Select
            label='Kritikalitet'
            value={value.criticality}
            onChange={(event) =>
              onChange!('technical', { ...value, criticality: event.target.value })
            }
          >
            <option value=''>Velg kritikalitet</option>
            {Object.entries(criticalities).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        ) : (
          <div>
            <Heading size='small' level='3'>
              Kritikalitet
            </Heading>
            <BodyShort>{criticalities[value.criticality] || 'Ikke registrert'}</BodyShort>
          </div>
        )}
      </div>
    )
  }
  if (section === 'economy') {
    const value = data.economy ?? {
      annualCost: null,
      purchaseCost: null,
      agreementUrl: '',
      purchaseDate: null,
      terminationTerms: '',
    }
    const money = (amount: string | number | null) =>
      amount == null || amount === ''
        ? 'Ikke registrert'
        : new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(
            Number(amount)
          )
    return (
      <div className='space-y-6'>
        {(['annualCost', 'purchaseCost'] as const).map((key) => (
          <div key={key}>
            {editing ? (
              <TextField
                label={key === 'annualCost' ? 'Årlig kostnad (uten mva)' : 'Innkjøpskostnad'}
                description='Beløp i norske kroner'
                type='number'
                min={0}
                max='999999999999.99'
                step='0.01'
                value={value[key] ?? ''}
                onChange={(event) =>
                  onChange!('economy', {
                    ...value,
                    [key]: event.target.value === '' ? null : event.target.value,
                  })
                }
              />
            ) : (
              <>
                <Heading size='small' level='3'>
                  {key === 'annualCost' ? 'Årlig kostnad (uten mva)' : 'Innkjøpskostnad'}
                </Heading>
                <BodyShort>{money(value[key])}</BodyShort>
              </>
            )}
          </div>
        ))}
        {editing ? (
          <TextField
            label='Avtale – lenke til avtale'
            type='url'
            maxLength={2000}
            value={value.agreementUrl}
            onChange={(event) =>
              onChange!('economy', { ...value, agreementUrl: event.target.value })
            }
          />
        ) : (
          <div>
            <Heading size='small' level='3'>
              Avtale
            </Heading>
            {value.agreementUrl ? (
              <Link href={value.agreementUrl} target='_blank' rel='noopener noreferrer'>
                Åpne avtale
              </Link>
            ) : (
              <BodyShort>Ikke registrert</BodyShort>
            )}
          </div>
        )}
        {editing ? (
          <div>
            <Label htmlFor='purchase-date'>Innkjøpsdato</Label>
            <input
              id='purchase-date'
              className='block rounded border p-3'
              style={{ background: 'var(--ax-bg-input)', color: 'var(--ax-text-neutral)' }}
              type='date'
              value={value.purchaseDate ?? ''}
              onChange={(event) =>
                onChange!('economy', { ...value, purchaseDate: event.target.value || null })
              }
            />
          </div>
        ) : (
          <div>
            <Heading size='small' level='3'>
              Innkjøpsdato
            </Heading>
            <BodyShort>
              {value.purchaseDate
                ? new Intl.DateTimeFormat('nb-NO').format(
                    new Date(`${value.purchaseDate}T12:00:00`)
                  )
                : 'Ikke registrert'}
            </BodyShort>
          </div>
        )}
        {editing ? (
          <Textarea
            label='Oppsigelsespremisser'
            maxLength={10000}
            value={value.terminationTerms}
            onChange={(event) =>
              onChange!('economy', { ...value, terminationTerms: event.target.value })
            }
          />
        ) : (
          <div>
            <Heading size='small' level='3'>
              Oppsigelsespremisser
            </Heading>
            <BodyShort className='whitespace-pre-wrap'>
              {value.terminationTerms || 'Ikke registrert'}
            </BodyShort>
          </div>
        )}
      </div>
    )
  }
  if (section !== 'accessibility') return null
  const value = data.accessibility ?? emptyAccessibility
  const type =
    value.solutionType === 'web' || value.solutionType === 'app' ? value.solutionType : null
  const checklist = type ? checklists[type].criteria : []
  const selectedAnswers = type === 'app' ? (value.appAnswers ?? {}) : (value.webAnswers ?? {})
  const checked = checklist.filter(
    (item) => selectedAnswers[item.id] && selectedAnswers[item.id] !== 'NOT_CHECKED'
  ).length
  const guidelines = [...new Set(checklist.map((item) => item.guideline))]
  return (
    <div className='space-y-6'>
      {editing ? (
        <RadioGroup
          legend='Er tilgjengelighetserklæring relevant?'
          value={value.relevance}
          onChange={(relevance: ISystemAccessibility['relevance']) =>
            onChange!('accessibility', { ...value, relevance })
          }
        >
          <Radio value='RELEVANT'>Relevant</Radio>
          <Radio value='NOT_RELEVANT'>Ikke relevant</Radio>
        </RadioGroup>
      ) : (
        <BodyShort>
          {value.relevance === 'RELEVANT'
            ? 'Relevant'
            : value.relevance === 'NOT_RELEVANT'
              ? 'Ikke relevant'
              : 'Relevans er ikke vurdert'}
        </BodyShort>
      )}
      {value.relevance === 'NOT_RELEVANT' && (
        <Alert variant='info'>
          Ingen sjekkliste er nødvendig. Eventuelle tidligere svar er beholdt.
        </Alert>
      )}
      {value.relevance === 'RELEVANT' && (
        <>
          {editing ? (
            <RadioGroup
              legend='Type løsning'
              value={value.solutionType}
              onChange={(solutionType: ISystemAccessibility['solutionType']) =>
                onChange!('accessibility', { ...value, solutionType })
              }
            >
              <Radio value='web'>Nettløsning</Radio>
              <Radio value='app'>App</Radio>
            </RadioGroup>
          ) : (
            <Heading size='small' level='3'>
              {type === 'web'
                ? 'Nettløsning'
                : type === 'app'
                  ? 'App'
                  : 'Type løsning er ikke valgt'}
            </Heading>
          )}
          {type && (
            <>
              <BodyShort>
                Sjekkliste fra Uu-tilsynet, oppdatert 30.01.2026.{' '}
                <Link
                  href='https://www.uutilsynet.no/tilgjengelighetserklaering/wcag-sjekklister-utfylling-av-tilgjengelighetserklaering/1333'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Se kilde og oppdaterte sjekklister
                </Link>
              </BodyShort>
              <BodyShort role='status'>
                {checked} av {checklist.length} krav er vurdert.
              </BodyShort>
              {guidelines.map((guideline) => {
                const items = checklist.filter((item) => item.guideline === guideline)
                return (
                  <details
                    key={`${type}-${guideline}`}
                    className='rounded-lg border p-4'
                    style={{ borderColor: 'var(--ax-border-neutral-subtle)' }}
                    open
                  >
                    <summary className='cursor-pointer font-semibold'>
                      {items[0].principle} – {guideline}
                    </summary>
                    <BodyShort className='my-4'>{items[0].description}</BodyShort>
                    <div className='space-y-5'>
                      {items.map((item) => (
                        <div key={item.id}>
                          <Link href={item.url} target='_blank' rel='noopener noreferrer'>
                            {item.title}
                          </Link>
                          {editing ? (
                            <Select
                              label={`Følges kravet ${item.id}?`}
                              value={selectedAnswers[item.id] ?? 'NOT_CHECKED'}
                              onChange={(event) =>
                                onChange!('accessibility', {
                                  ...value,
                                  [type === 'app' ? 'appAnswers' : 'webAnswers']: {
                                    ...selectedAnswers,
                                    [item.id]: event.target.value as TChecklistAnswer,
                                  },
                                })
                              }
                            >
                              {Object.entries(answers).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <BodyShort>
                              {answers[selectedAnswers[item.id] ?? 'NOT_CHECKED']}
                            </BodyShort>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}
