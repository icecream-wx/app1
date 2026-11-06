import http, { type ApiResponse } from './http'

export type Gender = 'MALE' | 'FEMALE'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

export interface Employee {
  id: number
  employeeNo: string
  name: string
  gender: Gender
  department: string
  position: string | null
  phone: string | null
  email: string | null
  hireDate: string | null
  status: EmployeeStatus
  createdAt: string
  updatedAt: string
}

export interface EmployeePayload {
  employeeNo: string
  name: string
  gender: Gender
  department: string
  position: string | null
  phone: string | null
  email: string | null
  hireDate: string | null
  status: EmployeeStatus
}

export interface PageData {
  list: Employee[]
  total: number
  page: number
  pageSize: number
}

export async function fetchEmployees(page: number, pageSize: number): Promise<PageData> {
  const response = await http.get<ApiResponse<PageData>>('/employees', {
    params: { page, pageSize }
  })
  return response.data.data
}

export async function fetchEmployee(id: string | number): Promise<Employee> {
  const response = await http.get<ApiResponse<Employee>>(`/employees/${id}`)
  return response.data.data
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const response = await http.post<ApiResponse<Employee>>('/employees', payload)
  return response.data.data
}

export async function updateEmployee(id: string | number, payload: EmployeePayload): Promise<Employee> {
  const response = await http.put<ApiResponse<Employee>>(`/employees/${id}`, payload)
  return response.data.data
}
