import { FormikProps } from 'formik'
import { ICodelistProps } from '@/provider/kodeverkProvider'
import { IDpProcessFormValues } from '../../../constants'
import FieldSubDepartments from '../../common/FieldSubDepartments'
import { ModalLabel } from '../../common/ModalSchema'
import FieldProductTeam from '../../common/form/FieldProductTeam'
import FieldDpProcessDepartment from './FieldDpProcessDepartment'

type TFieldDpProcessAffiliationProps = {
  formikBag: FormikProps<IDpProcessFormValues>
  codelistUtils: ICodelistProps
}

const FieldDpProcessAffiliation = (props: TFieldDpProcessAffiliationProps) => {
  const { formikBag, codelistUtils } = props

  return (
    <>
      <div className='w-full'>
        <ModalLabel
          label='Enhet'
          tooltip='Angi hvilken enhet som har hovedansvar for behandlingen.'
        />
        <FieldDpProcessDepartment department={formikBag.values.affiliation.nomDepartmentId} />

        <div className='mt-3'>
          <ModalLabel
            label='Underavdeling'
            tooltip='Velg underavdelinger som utfører behandlingen.'
          />
          <FieldSubDepartments formikBag={formikBag} codelistUtils={codelistUtils} />
        </div>
      </div>

      <div className='w-full mt-2.5'>
        <ModalLabel
          label='Team'
          tooltip='Angi hvilke team som har forvaltningsansvaret for IT-systemene.'
          fullwidth={true}
        />
      </div>

      <div className='w-full'>
        <FieldProductTeam
          productTeams={formikBag.values.affiliation.productTeams}
          fieldName='affiliation.productTeams'
        />
      </div>
    </>
  )
}

export default FieldDpProcessAffiliation
