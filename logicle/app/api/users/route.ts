import {
  KnownDbError,
  KnownDbErrorCode,
  defaultErrorResponse,
  interpretDbException,
} from '@/db/exception'
import { InsertableUser } from '@/types/db'
import { requireAdmin } from '@/api/utils/auth'
import ApiResponses from '@/api/utils/ApiResponses'
import { db } from 'db/database'
import { createUserRaw } from 'models/user'
import { NextRequest } from 'next/server'
import { SelectableUserDTO, mapRole, roleDto } from '@/types/user'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const GET = requireAdmin(async () => {
  const users = await db.selectFrom('User').selectAll().execute()
  const userDtos = users.map((user) => {
    const roleName = roleDto(user.roleId)
    if (!roleName) {
      return ApiResponses.internalServerError('Invalid user role')
    }
    return {
      ...user,
      role: roleName,
    } as SelectableUserDTO
  })
  return ApiResponses.json(userDtos)
})

export const POST = requireAdmin(async (req: NextRequest) => {
  const { name, email, password, role } = await req.json()
  const roleId = mapRole(role)
  if (!roleId) {
    return ApiResponses.invalidParameter('Invalid role')
  }
  try {
    const userInsert = {
      name: name,
      email: email,
      password: await hashPassword(password),
      roleId: roleId,
      role: undefined,
    } as InsertableUser
    const createdUser = await createUserRaw(userInsert)
    return ApiResponses.json(createdUser)
  } catch (e) {
    const interpretedException = interpretDbException(e)
    if (
      interpretedException instanceof KnownDbError &&
      interpretedException.code == KnownDbErrorCode.DUPLICATE_KEY
    ) {
      return ApiResponses.foreignKey('The user already exists')
    }
    return defaultErrorResponse(interpretedException)
  }
})
