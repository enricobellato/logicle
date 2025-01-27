import { deleteBackend, getBackend, updateBackend } from 'models/backend'
import { requireAdmin } from '@/api/utils/auth'
import ApiResponses from '@/api/utils/ApiResponses'
import { protectBackend } from '@/types/secure'
import {
  KnownDbError,
  KnownDbErrorCode,
  defaultErrorResponse,
  interpretDbException,
} from '@/db/exception'

export const dynamic = 'force-dynamic'

export const GET = requireAdmin(async (req: Request, route: { params: { backendId: string } }) => {
  const backend = await getBackend(route.params.backendId) // Use the helper function
  if (!backend) {
    return ApiResponses.noSuchEntity()
  }
  return ApiResponses.json(protectBackend(backend))
})

export const PATCH = requireAdmin(
  async (req: Request, route: { params: { backendId: string } }) => {
    const data = await req.json()
    await updateBackend(route.params.backendId, data)
    return ApiResponses.success()
  }
)

export const DELETE = requireAdmin(
  async (req: Request, route: { params: { backendId: string } }) => {
    try {
      await deleteBackend(route.params.backendId)
    } catch (e) {
      const interpretedException = interpretDbException(e)
      if (
        interpretedException instanceof KnownDbError &&
        interpretedException.code == KnownDbErrorCode.CANT_UPDATE_DELETE_FOREIGN_KEY
      ) {
        return ApiResponses.foreignKey('Backend is in use')
      }
      return defaultErrorResponse(interpretedException)
    }
    return ApiResponses.success()
  }
)
