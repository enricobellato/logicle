import { db } from 'db/database'
import { InsertableToolDTO, ToolDTO, UpdateableToolDTO } from '@/types/db'
import { nanoid } from 'nanoid'
import { Tool } from '@/db/types'

export const toolToDto = (tool: Tool): ToolDTO => {
  return {
    ...tool,
    configuration: JSON.parse(tool.configuration),
  }
}

export const getTools = async (): Promise<ToolDTO[]> => {
  return (await db.selectFrom('Tool').selectAll().execute()).map(toolToDto)
}

export const getToolsFiltered = async (ids: string[]): Promise<ToolDTO[]> => {
  const list = await db.selectFrom('Tool').selectAll().where('Tool.id', 'in', ids).execute()
  return list.map(toolToDto)
}

export const getTool = async (toolId: Tool['id']): Promise<ToolDTO | undefined> => {
  const tool = await db.selectFrom('Tool').selectAll().where('id', '=', toolId).executeTakeFirst()
  return tool ? toolToDto(tool) : undefined
}

export const createTool = async (tool: InsertableToolDTO): Promise<ToolDTO> => {
  const id = nanoid()
  await db
    .insertInto('Tool')
    .values({
      ...tool,
      configuration: JSON.stringify(tool.configuration),
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .executeTakeFirstOrThrow()
  const created = await getTool(id)
  if (!created) {
    throw new Error('Creation failed')
  }
  return created
}

export const updateTool = async (id: string, data: UpdateableToolDTO) => {
  const update = {
    ...data,
    configuration: data.configuration ? JSON.stringify(data.configuration) : undefined,
  }
  return db.updateTable('Tool').set(update).where('id', '=', id).execute()
}

export const deleteTool = async (toolId: Tool['id']) => {
  return db.deleteFrom('Tool').where('id', '=', toolId).executeTakeFirstOrThrow()
}
