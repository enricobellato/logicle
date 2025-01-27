import { useTranslation } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectContentScrollable,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBackends } from '@/hooks/backends'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { OpenAIModel } from '@/types/openai'
import { Textarea } from '@/components/ui/textarea'
import { AssistantTool, InsertableAssistantWithTools } from '@/types/db'
import ImageUpload from '@/components/ui/ImageUpload'
import { Switch } from '@/components/ui/switch'

interface Props {
  assistant: InsertableAssistantWithTools
  onSubmit: (assistant: InsertableAssistantWithTools) => void
  onChange?: (assistant: InsertableAssistantWithTools) => void
}

export const AssistantForm = ({ assistant, onSubmit, onChange }: Props) => {
  const [models, setModels] = useState<OpenAIModel[]>([])
  const { t } = useTranslation('common')
  const { data: backends } = useBackends()
  const abortController = useRef<AbortController | null>(null)

  const modelIds = models.map((model) => model.id)
  const formSchema = z.object({
    name: z.string().min(2, { message: 'name must be at least 2 characters.' }),
    icon: z.string().nullable(),
    description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
    model: z.custom<string>((val) => modelIds.includes(val as string)),
    backendId: z.string(),
    systemPrompt: z.string().min(2, { message: 'System prompt must be at least 2 characters.' }),
    tokenLimit: z.coerce.number().min(256),
    temperature: z.coerce.number().min(0).max(1),
    tools: z.any().array(),
  })

  type FormFields = z.infer<typeof formSchema>

  const form = useForm<FormFields>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...assistant,
    },
  })

  const updateModels = (backendId: string) => {
    async function getData() {
      abortController.current?.abort()
      abortController.current = null
      if (backendId === '') {
        setModels([])
        return
      }
      abortController.current = new AbortController()
      const response = await fetch(`/api/backends/${backendId}/models`, {
        signal: abortController.current.signal,
      })
      if (response.status == 200) {
        const json = await response.json()
        setModels(json.data)
      } else {
        setModels([])
      }
    }
    getData()
  }

  useEffect(() => {
    updateModels(assistant.backendId)
  }, [assistant.backendId])

  useEffect(() => {
    const subscription = form.watch(() => onChange && onChange(form.getValues()))
    return () => subscription.unsubscribe()
  }, [onChange, form.watch])

  const handleSubmit = (values: FormFields) => {
    onSubmit({
      ...assistant,
      ...values,
    })
  }
  return (
    <Form {...form} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem label={t('icon')}>
            <ImageUpload
              value={field.value}
              onValueChange={(value) => {
                form.setValue('icon', value)
              }}
            />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem label={t('name')}>
            <Input placeholder={t('create_assistant_field_name_placeholder')} {...field} />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem label={t('description')}>
            <Input placeholder={t('assistant-description-field-placeholder')} {...field} />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="backendId"
        render={({ field }) => (
          <FormItem label={t('backend')}>
            <Select
              onValueChange={(value) => {
                field.onChange(value)
                updateModels(value)
              }}
              defaultValue={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('create_assistant_field_select_backend_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {(backends ?? []).map((backend) => (
                  <SelectItem value={backend.id} key={backend.id}>
                    {backend.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="model"
        render={({ field }) => (
          <FormItem label={t('model')}>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={t('create_assistant_field_select_model_placeholder')} />
              </SelectTrigger>
              <SelectContentScrollable className="max-h-72">
                {models.map((model) => (
                  <SelectItem value={model.id} key={model.id}>
                    {model.id}
                  </SelectItem>
                ))}
              </SelectContentScrollable>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }) => (
          <FormItem label={t('system-prompt')}>
            <Textarea
              rows={3}
              placeholder={t('create_assistant_field_system_prompt_placeholder')}
              {...field}
            />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="tokenLimit"
        render={({ field }) => (
          <FormItem label={t('token-limit')}>
            <Input
              type="number"
              placeholder={t('create_assistant_field_token_limit_placeholder')}
              {...field}
            />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="temperature"
        render={({ field }) => (
          <FormItem label={t('temperature')}>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.1}
              placeholder={t('create_assistant_field_temperature_placeholder')}
              {...field}
            />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="tools"
        render={({ field }) => (
          <>
            {field.value.map((p) => {
              return (
                <div key={p.id} className="flex flex-row items-center space-y-0">
                  <div className="flex-1">{p.name}</div>
                  <Switch
                    onCheckedChange={(value) => {
                      form.setValue('tools', withEnablePatched(field.value, p.id, value))
                    }}
                    checked={p.enabled}
                  ></Switch>
                </div>
              )
            })}
          </>
        )}
      />
      <Button type="submit">Submit</Button>
    </Form>
  )
}
function withEnablePatched(tools: AssistantTool[], id: string, enabled: boolean) {
  return tools.map((p) => {
    return {
      ...p,
      enabled: p.id == id ? enabled : p.enabled,
    }
  })
}
