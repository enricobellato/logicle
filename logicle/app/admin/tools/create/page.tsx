'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'
import ToolForm from '../components/ToolForm'
import { mutate } from 'swr'
import toast from 'react-hot-toast'
import { useTranslation } from 'next-i18next'
import { post } from '@/lib/fetch'
import { AdminPageTitle } from '../../components/AdminPageTitle'
import { InsertableToolDTO, UpdateableToolDTO } from '@/types/db'
import { ChatGptRetrievalPluginInterface } from '@/lib/tools/chatgpt-retrieval-plugin/interface'

const CreateToolPage = () => {
  const { t } = useTranslation('common')
  const router = useRouter()

  const searchParams = useSearchParams()
  const type = searchParams.get('type') ?? ChatGptRetrievalPluginInterface.toolName

  // Use the ProviderDefaultFactory to create the default tool
  const defaultTool: InsertableToolDTO = {
    type,
    name: '',
    configuration: {},
  }

  async function onSubmit(values: UpdateableToolDTO) {
    const url = `/api/tools`
    const response = await post(url, { ...defaultTool, ...values })

    if (response.error) {
      toast.error(response.error.message)
      return
    }
    mutate(url)
    toast.success(t('tool-successfully-created'))
    router.push(`/admin/tools`)
  }

  return (
    <>
      <AdminPageTitle title={t('create-tool')} />
      <ToolForm tool={defaultTool} type={type} onSubmit={onSubmit} />
    </>
  )
}

export default CreateToolPage
