<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>员工列表</h1>
        <p class="sub">共 {{ total }} 名员工，按创建时间倒序展示</p>
      </div>
      <el-button type="primary" @click="goCreate">新增员工</el-button>
    </header>

    <el-alert
      v-if="error"
      class="page-alert"
      type="error"
      show-icon
      :closable="false"
      :title="`加载员工列表失败：${error}`"
    >
      <template #default>
        <el-button size="small" type="primary" plain @click="reload">重试</el-button>
      </template>
    </el-alert>

    <el-card v-else class="table-card" shadow="never">
      <div v-loading="loading" element-loading-text="加载中..." class="table-wrap">
        <el-empty v-if="!loading && total === 0" description="暂无员工数据" />

        <template v-else>
          <el-table v-if="total > 0" :data="list" row-key="id" border>
            <el-table-column prop="employeeNo" label="工号" min-width="110" />
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column label="性别" width="80">
              <template #default="{ row }">{{ genderText(row.gender) }}</template>
            </el-table-column>
            <el-table-column prop="department" label="部门" min-width="120" />
            <el-table-column label="岗位" min-width="110">
              <template #default="{ row }">
                <span :class="{ 'empty-cell': !row.position }">{{ displayValue(row.position) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="手机号" min-width="130">
              <template #default="{ row }">
                <span :class="{ 'empty-cell': !row.phone }">{{ displayValue(row.phone) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="邮箱" min-width="160">
              <template #default="{ row }">
                <span :class="{ 'empty-cell': !row.email }">{{ displayValue(row.email) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="入职日期" width="120">
              <template #default="{ row }">
                <span :class="{ 'empty-cell': !row.hireDate }">{{ displayValue(row.hireDate) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ statusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="goEdit(row.id)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="total > 0" class="pagination-row">
            <el-pagination
              :current-page="page"
              :page-size="pageSize"
              :page-sizes="[10, 20, 50]"
              :total="total"
              :disabled="loading"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @current-change="onPageChange"
              @size-change="onSizeChange"
            />
          </div>
        </template>
      </div>
    </el-card>

    <div v-if="loading && total === 0 && !error" class="loading-hint">正在加载员工数据...</div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchEmployees, type Employee } from '../api/employees'
import { toApiError } from '../api/http'
import { displayValue, genderText, statusText } from '../utils/display'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const list = ref<Employee[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

let requestSeq = 0

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const data = await fetchEmployees(page.value, pageSize.value)
    if (seq !== requestSeq) {
      return
    }
    if (data.total > 0 && data.list.length === 0 && page.value > 1) {
      const maxPage = Math.max(1, Math.ceil(data.total / data.pageSize))
      if (maxPage !== page.value) {
        page.value = maxPage
        ElMessage.warning('当前页码超出范围，已回到有效页码')
        await load()
        return
      }
    }
    list.value = data.list
    total.value = data.total
    page.value = data.page
    pageSize.value = data.pageSize
  } catch (unknownError) {
    if (seq === requestSeq) {
      error.value = toApiError(unknownError).message
      list.value = []
      total.value = 0
    }
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

function reload(): void {
  void load()
}

function onPageChange(nextPage: number): void {
  page.value = nextPage
  void load()
}

function onSizeChange(nextSize: number): void {
  pageSize.value = nextSize
  page.value = 1
  void load()
}

function goCreate(): void {
  void router.push('/employees/new')
}

function goEdit(id: number): void {
  void router.push(`/employees/${id}/edit`)
}
</script>
