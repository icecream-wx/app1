import { nextTick } from 'vue'

export async function focusField(field: string): Promise<void> {
  await nextTick()
  const element = document.querySelector<HTMLElement>(`[name="${field}"]`)
  element?.focus()
}

export function genderText(gender: string | null | undefined): string {
  if (gender === 'MALE') {
    return '男'
  }
  if (gender === 'FEMALE') {
    return '女'
  }
  return '-'
}

export function statusText(status: string | null | undefined): string {
  if (status === 'ACTIVE') {
    return '在职'
  }
  if (status === 'INACTIVE') {
    return '离职'
  }
  return '-'
}

export function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === '') {
    return '-'
  }
  return value
}
