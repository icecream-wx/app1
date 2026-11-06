<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>新增员工</h1>
        <p class="sub">填写员工信息，标记 * 的字段为必填项。</p>
      </div>
      <el-button @click="goBack">返回列表</el-button>
    </header>

    <el-alert
      v-if="pageError"
      class="page-alert"
      type="error"
      show-icon
      :closable="false"
      :title="pageError"
    />

    <el-card class="form-card" shadow="never">
      <EmployeeFormFields
        ref="formRef"
        v-model="form"
        :server-errors="serverErrors"
      />

      <div class="form-actions">
        <el-button :disabled="submitting" @click="goBack">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中...' : '提交' }}
        </el-button>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { createEmployee, type EmployeePayload, type Gender } from '../api/employees'
import { toApiError } from '../api/http'
import {
  FIELD_ORDER,
  emptyEmployeeForm,
  firstErrorField,
  type EmployeeFormModel
} from '../utils/employee-form'
import { focusField } from '../utils/display'

const router = useRouter()

const form = reactive<EmployeeFormModel>(emptyEmployeeForm())
const formRef = ref<InstanceType<typeof EmployeeFormFields> | null>(null)
const serverErrors = reactive<Record<string, string>>({})
const pageError = ref('')
const submitting = ref(false)
let submitInFlight = false

watch(
  form,
  () => {
    pageError.value = ''
    clearServerErrors()
  },
  { deep: true }
)

function clearServerErrors(): void {
  for (const key of Object.keys(serverErrors)) {
    delete serverErrors[key]
  }
}

function toPayload(model: EmployeeFormModel): EmployeePayload {
  return {
    employeeNo: model.employeeNo.trim(),
    name: model.name.trim(),
    gender: model.gender as Gender,
    department: model.department.trim(),
    position: model.position.trim() || null,
    phone: model.phone.trim() || null,
    email: model.email.trim() || null,
    hireDate: model.hireDate || null,
    status: model.status
  }
}

async function applyFieldErrors(fields: { field: string; message: string }[]): Promise<void> {
  const knownFields = new Set<string>(FIELD_ORDER)
  let firstField = ''
  for (const item of fields) {
    if (knownFields.has(item.field)) {
      serverErrors[item.field] = item.message
      if (!firstField) {
        firstField = item.field
      }
    } else if (!pageError.value) {
      pageError.value = item.message
    }
  }
  if (firstField) {
    formRef.value?.scrollToField(firstField)
    await focusField(firstField)
  }
}

async function submit(): Promise<void> {
  // Synchronous lock: two clicks in the same tick must only issue one request.
  if (submitInFlight) {
    return
  }
  submitInFlight = true
  pageError.value = ''
  clearServerErrors()

  try {
    const result = await formRef.value?.validate()
    if (!result || !result.valid) {
      const firstField = firstErrorField(result?.fields)
      if (firstField) {
        formRef.value?.scrollToField(firstField)
        await focusField(firstField)
      }
      return
    }

    submitting.value = true
    try {
      await createEmployee(toPayload(form))
      ElMessage.success('新增成功')
      await router.push('/employees')
    } catch (unknownError) {
      const apiError = toApiError(unknownError)
      if (apiError.status === 400 && apiError.fields.length > 0) {
        await applyFieldErrors(apiError.fields)
      } else if (apiError.status === 409) {
        serverErrors.employeeNo = '工号已存在'
        formRef.value?.scrollToField('employeeNo')
        await focusField('employeeNo')
      } else {
        pageError.value = apiError.message
      }
    }
  } finally {
    submitting.value = false
    submitInFlight = false
  }
}

function goBack(): void {
  void router.push('/employees')
}
</script>
