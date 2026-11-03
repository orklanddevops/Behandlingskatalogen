'use client'

import { PencilIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyShort,
  Button,
  Checkbox,
  Detail,
  Heading,
  Label,
  Link,
  Loader,
  TextField,
  Textarea,
} from '@navikt/ds-react'
import axios from 'axios'
import { FormEvent, useContext, useEffect, useState } from 'react'
import Select from 'react-select'
import {
  ISystemContact,
  ISystemInformation,
  ISystemInformationData,
  ISystemTeam,
  getSystemInformation,
  saveSystemInformation,
} from '@/api/SystemInformationApi'
import { getAllTeams } from '@/api/TeamApi'
import { UserContext } from '@/provider/userProvider'
import { selectOverrides } from '../common/AsyncSelectComponents'
import EmployeePicker from './EmployeePicker'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('nb-NO', { dateStyle: 'long' }).format(
    new Date(value.length === 10 ? `${value}T12:00:00` : value)
  )

function Contacts({ contacts }: { contacts: ISystemContact[] }) {
  if (contacts.length === 0) return <BodyShort>Ikke registrert</BodyShort>
  return (
    <ul className='m-0 list-none space-y-3 p-0'>
      {contacts.map((contact) => (
        <li key={contact.id}>
          <BodyShort weight='semibold'>{contact.name}</BodyShort>
          {contact.email && <Link href={`mailto:${contact.email}`}>{contact.email}</Link>}
        </li>
      ))}
    </ul>
  )
}

export default function SystemInformationPanel({ systemCode }: { systemCode: string }) {
  const user = useContext(UserContext)
  const [info, setInfo] = useState<ISystemInformation | null>(null)
  const [draft, setDraft] = useState<ISystemInformation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [markVerified, setMarkVerified] = useState(false)
  const [teams, setTeams] = useState<ISystemTeam[]>([])
  const [teamsError, setTeamsError] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const editing = draft !== null
  const loggedIn = user.isLoggedIn()
  const userLoaded = user.isLoaded()

  useEffect(() => {
    let active = true
    if (!userLoaded || !loggedIn) return
    getSystemInformation(systemCode)
      .then((data) => {
        if (active) setInfo(data)
      })
      .catch(() => {
        if (active) setError('Kunne ikke hente systeminformasjonen. Prøv å laste siden på nytt.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [systemCode, userLoaded, loggedIn])

  useEffect(() => {
    let active = true
    if (!editing) return
    getAllTeams()
      .then((result) => {
        if (active) {
          setTeams(result.map((team) => ({ id: team.id, name: team.name })))
          setTeamsError(false)
        }
      })
      .catch(() => {
        if (active) setTeamsError(true)
      })
      .finally(() => {
        if (active) setTeamsLoading(false)
      })
    return () => {
      active = false
    }
  }, [editing])

  const edit = () => {
    if (!info) return
    setTeamsLoading(true)
    setDraft({ ...info, data: { ...info.data } })
    setMarkVerified(false)
    setSuccess(false)
    setError('')
  }

  const change = <K extends keyof ISystemInformationData>(
    field: K,
    value: ISystemInformationData[K]
  ) =>
    setDraft((current) =>
      current ? { ...current, data: { ...current.data, [field]: value } } : current
    )

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await saveSystemInformation(draft, markVerified)
      setInfo(saved)
      setDraft(null)
      setSuccess(true)
    } catch (failure) {
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined
      setError(
        status === 409
          ? 'En annen bruker har endret informasjonen. Endringene dine står fortsatt i skjemaet. Kopier det du vil beholde før du laster siden på nytt.'
          : status === 401 || status === 403
            ? 'Du har ikke tilgang til å lagre. Kontroller at du er innlogget og har skrivetilgang.'
            : status === 400
              ? 'Kunne ikke lagre. Kontroller feltene og velg ansatte og team fra søkeresultatene.'
              : 'Kunne ikke lagre systeminformasjonen. Endringene dine er beholdt. Prøv igjen senere.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!userLoaded) return <Loader title='Henter brukerinformasjon' className='my-8' />
  if (!loggedIn)
    return (
      <Alert variant='info' className='my-6'>
        Logg inn for å se ansvar og kontaktpersoner for systemet.
      </Alert>
    )
  if (loading) return <Loader title='Henter systeminformasjon' className='my-8' />

  return (
    <section className='max-w-5xl py-6' aria-labelledby='system-information-heading'>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Heading level='2' size='medium' id='system-information-heading'>
            Ansvar og kontakt
          </Heading>
          <BodyShort className='mt-2'>Hvem har ansvar for systemet, og hvem kan hjelpe?</BodyShort>
        </div>
        {!draft && info && user.canWrite() && (
          <Button variant='secondary' icon={<PencilIcon aria-hidden />} onClick={edit}>
            Rediger systeminformasjon
          </Button>
        )}
      </div>
      {error && (
        <Alert variant='error' className='mb-6' role='alert'>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant='success' className='mb-6' role='status'>
          Systeminformasjonen er lagret.
        </Alert>
      )}
      {draft ? (
        <form onSubmit={save} className='space-y-8'>
          <fieldset disabled={saving} className='m-0 min-w-0 space-y-6 border-0 p-0'>
            <legend className='sr-only'>Rediger ansvar og kontaktpersoner</legend>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <EmployeePicker
                id='system-owner'
                label='Systemeier'
                value={draft.data.systemOwner ? [draft.data.systemOwner] : []}
                onChange={(contacts) => change('systemOwner', contacts[0] ?? null)}
              />
              <div>
                <Label htmlFor='responsible-team'>Ansvarlig team</Label>
                <Select<ISystemTeam>
                  inputId='responsible-team'
                  instanceId='responsible-team'
                  aria-label='Ansvarlig team'
                  placeholder='Velg team'
                  isClearable
                  isLoading={teamsLoading}
                  options={teams}
                  getOptionValue={(team) => team.id}
                  getOptionLabel={(team) => team.name}
                  value={draft.data.responsibleTeam}
                  onChange={(team) => change('responsibleTeam', team)}
                  styles={selectOverrides}
                  noOptionsMessage={() =>
                    teamsError
                      ? 'Kunne ikke hente team. Prøv igjen senere.'
                      : 'Ingen team tilgjengelig'
                  }
                />
                {teamsError && (
                  <p role='status' className='mt-1 text-sm'>
                    Teamoppslaget er utilgjengelig. Eksisterende teamvalg beholdes.
                  </p>
                )}
              </div>
            </div>
            <EmployeePicker
              id='system-administrators'
              label='Systemadministratorer'
              multiple
              value={draft.data.administrators}
              onChange={(contacts) => change('administrators', contacts)}
            />
            <EmployeePicker
              id='system-superusers'
              label='Superbrukere'
              multiple
              value={draft.data.superUsers}
              onChange={(contacts) => change('superUsers', contacts)}
            />
            <TextField
              label='Ansvarlig enhet'
              description='Enheten som har det overordnede ansvaret for systemet.'
              maxLength={250}
              value={draft.data.organisationalUnit}
              onChange={(event) => change('organisationalUnit', event.target.value)}
            />
            <Heading level='3' size='small'>
              Brukerstøtte
            </Heading>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <TextField
                label='E-post til brukerstøtte'
                type='email'
                maxLength={254}
                value={draft.data.supportEmail}
                onChange={(event) => change('supportEmail', event.target.value)}
              />
              <TextField
                label='Lenke til brukerstøtte'
                description='Bruk en fullstendig adresse, for eksempel https://…'
                type='url'
                maxLength={2000}
                value={draft.data.supportUrl}
                onChange={(event) => change('supportUrl', event.target.value)}
              />
            </div>
            <Textarea
              label='Merknader'
              description='For eksempel avklaringer om ansvarsdeling eller hvem som skal kontaktes.'
              maxLength={10000}
              value={draft.data.notes}
              onChange={(event) => change('notes', event.target.value)}
            />
            <Checkbox
              checked={markVerified}
              onChange={(event) => setMarkVerified(event.target.checked)}
            >
              Jeg har kontrollert at informasjonen er oppdatert
            </Checkbox>
          </fieldset>
          <div className='flex flex-wrap gap-3'>
            <Button type='submit' loading={saving}>
              Lagre
            </Button>
            <Button
              type='button'
              variant='secondary'
              disabled={saving}
              onClick={() => {
                setDraft(null)
                setError('')
              }}
            >
              Avbryt
            </Button>
          </div>
        </form>
      ) : info?.version == null ? (
        info && (
          <Alert variant='info'>
            Systeminformasjon er ikke registrert ennå.
            {user.canWrite()
              ? ' Velg «Rediger systeminformasjon» for å legge til ansvar og kontaktpersoner.'
              : ''}
          </Alert>
        )
      ) : (
        <div className='space-y-8'>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {[
              {
                title: 'Systemeier',
                contacts: info.data.systemOwner ? [info.data.systemOwner] : [],
              },
              { title: 'Systemadministratorer', contacts: info.data.administrators },
              { title: 'Superbrukere', contacts: info.data.superUsers },
            ].map((group) => (
              <div
                key={group.title}
                className='rounded-lg border p-5'
                style={{ borderColor: 'var(--ax-border-neutral-subtle)' }}
              >
                <Heading level='3' size='small' className='mb-3'>
                  {group.title}
                </Heading>
                <Contacts contacts={group.contacts} />
              </div>
            ))}
            <div
              className='rounded-lg border p-5'
              style={{ borderColor: 'var(--ax-border-neutral-subtle)' }}
            >
              <Heading level='3' size='small' className='mb-3'>
                Organisering
              </Heading>
              <BodyShort weight='semibold'>Ansvarlig team</BodyShort>
              <BodyShort>{info.data.responsibleTeam?.name || 'Ikke registrert'}</BodyShort>
              <BodyShort weight='semibold' className='mt-4'>
                Ansvarlig enhet
              </BodyShort>
              <BodyShort>{info.data.organisationalUnit || 'Ikke registrert'}</BodyShort>
            </div>
          </div>
          <div>
            <Heading level='3' size='small' className='mb-3'>
              Brukerstøtte
            </Heading>
            {!info.data.supportEmail && !info.data.supportUrl && (
              <BodyShort>Ikke registrert</BodyShort>
            )}
            {info.data.supportEmail && (
              <div>
                <Link href={`mailto:${info.data.supportEmail}`}>{info.data.supportEmail}</Link>
              </div>
            )}
            {info.data.supportUrl && (
              <div className='mt-2'>
                <Link href={info.data.supportUrl} target='_blank' rel='noopener noreferrer'>
                  Åpne brukerstøtte
                </Link>
              </div>
            )}
          </div>
          {info.data.notes && (
            <div>
              <Heading level='3' size='small' className='mb-3'>
                Merknader
              </Heading>
              <BodyShort className='whitespace-pre-wrap'>{info.data.notes}</BodyShort>
            </div>
          )}
          <div className='border-t pt-4' style={{ borderColor: 'var(--ax-border-neutral-subtle)' }}>
            <BodyShort>
              {info.data.lastVerifiedDate
                ? `Sist kontrollert ${formatDate(info.data.lastVerifiedDate)}${info.data.lastVerifiedBy ? ` av ${info.data.lastVerifiedBy}` : ''}`
                : 'Informasjonen er ikke bekreftet kontrollert.'}
            </BodyShort>
            {info.updatedAt && (
              <Detail className='mt-2'>
                Sist endret {formatDate(info.updatedAt)}
                {info.updatedBy ? ` av ${info.updatedBy}` : ''}
              </Detail>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
