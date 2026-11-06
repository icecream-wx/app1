import type { FormRules } from 'element-plus'

export interface EmployeeFormModel {
  employeeNo: string
  name: string
  gender: 'MALE' | 'FEMALE' | ''
  department: string
  position: string
  phone: string
  email: string
  hireDate: string
  status: 'ACTIVE' | 'INACTIVE'
}

export const FIELD_ORDER = [
  'employeeNo',
  'name',
  'gender',
  'department',
  'position',
  'phone',
  'email',
  'hireDate',
  'status'
] as const

export function emptyEmployeeForm(): EmployeeFormModel {
  return {
    employeeNo: '',
    name: '',
    gender: '',
    department: '',
    position: '',
    phone: '',
    email: '',
    hireDate: '',
    status: 'ACTIVE'
  }
}

function textRule(label: string, max: number, required: boolean) {
  return {
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      const text = String(value ?? '').trim()
      if (required && text.length === 0) {
        callback(new Error(`${label}不能为空`))
        return
      }
      if (text.length > max) {
        callback(new Error(`${label}长度不能超过${max}`))
        return
      }
      callback()
    },
    trigger: ['blur', 'change']
  }
}

export const employeeRules: FormRules<EmployeeFormModel> = {
  employeeNo: [textRule('工号', 32, true)],
  name: [textRule('姓名', 32, true)],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  department: [textRule('部门', 64, true)],
  position: [textRule('岗位', 64, false)],
  phone: [
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        const text = String(value ?? '').trim()
        if (text.length > 0 && !/^\d{11}$/.test(text)) {
          callback(new Error('手机号必须为11位数字'))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ],
  email: [
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        const text = String(value ?? '').trim()
        if (text.length === 0) {
          callback()
          return
        }
        if (text.length > 128) {
          callback(new Error('邮箱长度不能超过128'))
          return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          callback(new Error('邮箱格式不正确'))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

export function firstErrorField(fields: Record<string, unknown> | undefined): string | undefined {
  if (!fields) {
    return undefined
  }
  for (const field of FIELD_ORDER) {
    if (fields[field]) {
      return field
    }
  }
  return Object.keys(fields)[0]
}
