'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'
import BackendForm, { BackendFormFields } from '../components/BackendForm'
import { mutate } from 'swr'
import toast from 'react-hot-toast'
import { useTranslation } from 'next-i18next'
import { post } from '@/lib/fetch'
import { AdminPageTitle } from '../../components/AdminPageTitle'
import { ProtectedBackend } from '@/types/secure'
import { ProviderDefaultFactory } from '@/types/provider'
import { ProviderType } from '@/db/types'

const CreateBackendPage = () => {
  const { t } = useTranslation('common')
  const router = useRouter()

  const searchParams = useSearchParams()
  const providerTypeParam = searchParams.get('providerType') ?? 'GenericOpenAIServer'
  const providerType = Object.values(ProviderType).find((type) => type === providerTypeParam)

  // Use the ProviderDefaultFactory to create the default backend
  const defaultBackend: Omit<ProtectedBackend, 'id'> = ProviderDefaultFactory.create(
    providerType as ProviderType
  )

  async function onSubmit(values: Partial<BackendFormFields>) {
    const url = `/api/backends`
    const response = await post(url, { ...defaultBackend, ...values })

    if (response.error) {
      toast.error(response.error.message)
      return
    }
    mutate(url)
    toast.success(t('backend-successfully-created'))
    router.push(`/admin/backends`)
  }

  return (
    <>
      <AdminPageTitle title={t('create-backend')} />
      <BackendForm backend={defaultBackend} onSubmit={onSubmit} />
    </>
  )
}

export default CreateBackendPage
