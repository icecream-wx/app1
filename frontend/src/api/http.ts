import axios from 'axios'

export interface FieldError {
  field: string
  message: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ApiError {
  status?: number
  message: string
  fields: FieldError[]
}

const http = axios.create({
  baseURL: '/api',
  timeout: 15000
})

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const body = error.response?.data as Partial<ApiResponse<FieldError[]>> | undefined
    if (body && typeof body.code === 'number') {
      return {
        status,
        message: body.message || '请求失败',
        fields: Array.isArray(body.data) ? body.data : []
      }
    }
    if (status === 404) {
      return { status, message: '员工不存在或已被移除', fields: [] }
    }
    if (status !== undefined && status >= 500) {
      return { status, message: '服务器异常，请稍后重试', fields: [] }
    }
    return { status, message: '网络异常，请检查后端服务是否可用', fields: [] }
  }
  return { message: '发生未知错误，请重试', fields: [] }
}

export default http
