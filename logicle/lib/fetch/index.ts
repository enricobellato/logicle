import { ApiResponse } from '@/types/base'

const defaultHeaders = {
  'Content-Type': 'application/json',
}

export async function get<T>(url: string): Promise<ApiResponse<T>> {
  return fetchApiResponse(url, {
    method: 'GET',
  })
}

export async function delete_<T>(url: string): Promise<ApiResponse<T>> {
  return fetchApiResponse(url, {
    method: 'DELETE',
  })
}

export async function put<T>(url: string, body: object): Promise<ApiResponse<T>> {
  return fetchApiResponse(url, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
}

export async function post<T>(url: string, body: object): Promise<ApiResponse<T>> {
  return fetchApiResponse(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
}

export async function patch<T>(url: string, body: object): Promise<ApiResponse<T>> {
  return fetchApiResponse(url, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
}

export async function fetchApiResponse<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(input, init)
  if (response.ok) {
    return {
      data: (await response.json()) as T,
    } as ApiResponse<T>
  }
  const isJson = response.headers.get('content-type')?.includes('application/json')
  let apiResponse: ApiResponse<T>
  if (isJson) {
    apiResponse = (await response.json()) as ApiResponse<T>
  } else {
    apiResponse = {
      error: {
        code: response.status,
        message: response.statusText,
        values: {},
      },
    } as ApiResponse<T>
  }
  return apiResponse
}
