<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>编辑员工</h1>
        <p class="sub">修改员工信息，工号不可变更。</p>
      </div>
      <el-button @click="goBack">返回列表</el-button>
    </header>

    <div v-if="loading" class="state-box">
      <p class="state-title">加载中...</p>
      <p class="state-desc">正在获取员工信息，请稍候。</p>
    </div>

    <div v-else-if="notFound" class="state-box">
      <p class="state-title">员工不存在或已被移除</p>
      <p class="state-desc">该员工可能已被删除，无法继续编辑。</p>
      <el-button type="primary" @click="goBack">返回列表</el-button>
    </div>

    <el-alert
      v-else-if="loadError"
      class="page-alert"
      type="error"
      show-icon
      :closable="false"
      :title="`加载员工信息失败：${loadError}`"
    >
      <template #default>
        <el-button size="small" type="primary" plain @click="load">重试</el-button>
        <el-button size="small" plain @click="goBack">返回列表</el-button>
      </template>
    </el-alert>

    <template v-else-if="ready">
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
          employee-no-readonly
        />

        <div class="form-actions">
          <el-button :disabled="submitting" @click="goBack">取消</el-button>
          <el-button type="primary" :loading="submitting" :disabled="submitting" @click="submit">
            {{ submitting ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </el-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EmployeeFormFields from '../components/EmployeeFormFields.vue'
import { fetchEmployee, updateEmployee, type EmployeePayload, type Gender } from '../api/employees'
import { toApiError } from '../api/http'
import {
  FIELD_ORDER,
  emptyEmployeeForm,
  firstErrorField,
  type EmployeeFormModel
} from '../utils/employee-form'
import { focusField } from '../utils/display'

const route = useRoute()
const router = useRouter()

const form = reactive<EmployeeFormModel>(emptyEmployeeForm())
const formRef = ref<InstanceType<typeof EmployeeFormFields> | null>(null)
const serverErrors = reactive<Record<string, string>>({})
const pageError = ref('')
const loadError = ref('')
const loading = ref(true)
const ready = ref(false)
const notFound = ref(false)
const submitting = ref(false)
let submitInFlight = false

const employeeId = String(route.params.id ?? '')

watch(
  form,
  () => {
    pageError.value = ''
    clearServerErrors()
  },
  { deep: true }
)

onMounted(() => {
  void load()
})

function clearServerErrors(): void {
  for (const key of Object.keys(serverErrors)) {
    delete serverErrors[key]
  }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  notFound.value = false
  ready.value = false
  try {
    const employee = await fetchEmployee(employeeId)
    form.employeeNo = employee.employeeNo
    form.name = employee.name
    form.gender = employee.gender
    form.department = employee.department
    form.position = employee.position ?? ''
    form.phone = employee.phone ?? ''
    form.email = employee.email ?? ''
    form.hireDate = employee.hireDate ?? ''
    form.status = employee.status
    ready.value = true
  } catch (unknownError) {
    const apiError = toApiError(unknownError)
    if (apiError.status === 404) {
      notFound.value = true
    } else {
      loadError.value = apiError.message
    }
  } finally {
    loading.value = false
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
      await updateEmployee(employeeId, toPayload(form))
      ElMessage.success('保存成功')
      await router.push('/employees')
    } catch (unknownError) {
      const apiError = toApiError(unknownError)
      if (apiError.status === 400 && apiError.fields.length > 0) {
        await applyFieldErrors(apiError.fields)
      } else if (apiError.status === 409) {
        pageError.value = '工号已存在，当前工号不可修改，请返回列表检查'
      } else if (apiError.status === 404) {
        ready.value = false
        notFound.value = true
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
