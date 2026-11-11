import { BodyShort, Modal } from '@navikt/ds-react'
import { TLocation, TNavigateFunction, useLocation, useNavigate } from '@/util/router'
import Button from '../../common/Button/CustomButton'

interface IProps {
  openAddPolicy: () => void
  openAddDocument: () => void
}

export const ProcessCreatedModal = (props: IProps) => {
  const { openAddPolicy, openAddDocument } = props
  const history: TNavigateFunction = useNavigate()
  const location: TLocation<any> = useLocation()
  const closeModal = () => {
    const query = new URLSearchParams(location.search)
    query.delete('create')
    const search = query.toString()
    history(location.pathname + (search ? `?${search}` : '') + location.hash)
  }

  return (
    <Modal
      header={{ heading: 'Databehandling opprettet', closeButton: false }}
      open={new URLSearchParams(location.search).get('create') === 'true'}
      onClose={closeModal}
    >
      <Modal.Body>
        <BodyShort spacing>Vil du legge til opplysningstyper?</BodyShort>
      </Modal.Body>
      <Modal.Footer>
        <div className='flex justify-end'>
          <Button size='xsmall' kind='tertiary' marginRight onClick={closeModal}>
            Nei
          </Button>
          <Button
            size='xsmall'
            kind='primary'
            marginRight
            onClick={() => {
              closeModal()
              openAddPolicy()
            }}
          >
            Legg til opplysningstyper enkeltvis
          </Button>
          <Button
            size='xsmall'
            kind='primary'
            onClick={() => {
              closeModal()
              openAddDocument()
            }}
          >
            Legg til standardopplysningstyper
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
