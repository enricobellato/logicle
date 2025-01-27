'use client'
import { WithLoadingAndError } from '@/components/ui'
import { useUsers, mutateUsers } from '@/hooks/users'
import { useTranslation } from 'next-i18next'
import { Column, ScrollableTable, column } from '@/components/ui/tables'
import { useConfirmationContext } from '@/components/providers/confirmationContext'
import { delete_ } from '@/lib/fetch'
import toast from 'react-hot-toast'
import { AdminPageTitle } from '@/app/admin/components/AdminPageTitle'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import AddUser from './AddUser'
import { SelectableUserDTO } from '@/types/user'
import DeleteButton from '../components/DeleteButton'
import { Link } from '@/components/ui/link'
import CreateButton from '../components/CreateButton'

const AllUsers = () => {
  const { t } = useTranslation('common')
  const { isLoading, error, data: users } = useUsers()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const session = useSession()
  const modalContext = useConfirmationContext()

  async function onDelete(user: SelectableUserDTO) {
    const result = await modalContext.askConfirmation({
      title: `${t('remove-user')} ${user?.name}`,
      message: <p>{t('remove-user-confirmation')}</p>,
      confirmMsg: t('remove-user'),
    })
    if (!result) return

    const response = await delete_(`/api/users/${user.id}`)
    if (response.error) {
      toast.error(response.error.message)
      return
    }
    mutateUsers()
    await session.update()
    toast.success(t('user-deleted'))
  }

  const columns: Column<SelectableUserDTO>[] = [
    column(t('table-column-name'), (user) => (
      <Link variant="ghost" href={`/admin/users/${user.id}`}>
        {user.name}
      </Link>
    )),
    column(t('table-column-email'), (user) => user.email),
    column(t('table-column-user-role'), (user) => user.role),
    column(t('table-column-actions'), (user) => (
      <DeleteButton onClick={() => onDelete(user)}>{t('remove-user')}</DeleteButton>
    )),
  ]

  return (
    <WithLoadingAndError isLoading={isLoading} error={error}>
      <div className="h-full flex flex-col">
        <AdminPageTitle title={t('all-users')}>
          <CreateButton onClick={() => setShowAddDialog(true)} />
        </AdminPageTitle>
        <ScrollableTable
          className="flex-1"
          columns={columns}
          rows={users ?? []}
          keygen={(t) => t.id}
        />
        {showAddDialog && <AddUser setVisible={setShowAddDialog}></AddUser>}
      </div>
    </WithLoadingAndError>
  )
}

export default AllUsers
