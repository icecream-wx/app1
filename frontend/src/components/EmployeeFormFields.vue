<template>
  <el-form
    ref="formRef"
    :model="model"
    :rules="employeeRules"
    label-width="100px"
    status-icon
  >
    <el-form-item label="工号" prop="employeeNo" :error="serverErrors.employeeNo">
      <el-input
        v-model="model.employeeNo"
        name="employeeNo"
        maxlength="32"
        show-word-limit
        :disabled="employeeNoReadonly"
        placeholder="请输入员工工号"
      />
      <div v-if="employeeNoReadonly" class="readonly-hint">工号为唯一标识，编辑时不可修改</div>
    </el-form-item>

    <el-form-item label="姓名" prop="name" :error="serverErrors.name">
      <el-input
        v-model="model.name"
        name="name"
        maxlength="32"
        show-word-limit
        placeholder="请输入姓名"
      />
    </el-form-item>

    <el-form-item label="性别" prop="gender" :error="serverErrors.gender">
      <el-radio-group v-model="model.gender" name="gender">
        <el-radio value="MALE">男</el-radio>
        <el-radio value="FEMALE">女</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="部门" prop="department" :error="serverErrors.department">
      <el-input
        v-model="model.department"
        name="department"
        maxlength="64"
        show-word-limit
        placeholder="请输入部门"
      />
    </el-form-item>

    <el-form-item label="岗位" prop="position" :error="serverErrors.position">
      <el-input
        v-model="model.position"
        name="position"
        maxlength="64"
        show-word-limit
        placeholder="请输入岗位（选填）"
      />
    </el-form-item>

    <el-form-item label="手机号" prop="phone" :error="serverErrors.phone">
      <el-input
        v-model="model.phone"
        name="phone"
        maxlength="11"
        placeholder="11 位手机号（选填）"
      />
    </el-form-item>

    <el-form-item label="邮箱" prop="email" :error="serverErrors.email">
      <el-input
        v-model="model.email"
        name="email"
        maxlength="128"
        placeholder="邮箱地址（选填）"
      />
    </el-form-item>

    <el-form-item label="入职日期" prop="hireDate" :error="serverErrors.hireDate">
      <el-date-picker
        v-model="model.hireDate"
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        placeholder="选择入职日期（选填）"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="状态" prop="status" :error="serverErrors.status">
      <el-radio-group v-model="model.status" name="status">
        <el-radio value="ACTIVE">在职</el-radio>
        <el-radio value="INACTIVE">离职</el-radio>
      </el-radio-group>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { employeeRules, type EmployeeFormModel } from '../utils/employee-form'

const model = defineModel<EmployeeFormModel>({ required: true })
defineProps<{
  serverErrors: Record<string, string>
  employeeNoReadonly?: boolean
}>()

const formRef = ref<FormInstance>()

function validate(): Promise<{ valid: boolean; fields?: Record<string, unknown> }> {
  return new Promise((resolve) => {
    if (!formRef.value) {
      resolve({ valid: false })
      return
    }
    formRef.value.validate((valid, fields) => {
      resolve({ valid: Boolean(valid), fields: fields as Record<string, unknown> | undefined })
    })
  })
}

function scrollToField(field: string): void {
  formRef.value?.scrollToField(field)
}

defineExpose({ validate, scrollToField })
</script>
