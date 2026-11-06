import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const backendDir = path.join(root, 'backend')
const frontendDir = path.join(root, 'frontend')
const deliveryDir = path.join(root, '.opencode', 'delivery')
const screenshotDir = path.join(deliveryDir, 'screenshots')
const artifactDir = path.join(here, '.artifacts')
const jarPath = path.join(backendDir, 'target', 'employee-service-0.1.0.jar')
const frontendUrl = 'http://127.0.0.1:5173'
const backendUrl = 'http://127.0.0.1:8080'
const chromePath = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const javaBin = process.env.JAVA_BIN
  || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java.exe') : 'java')

const childEnv = {
  ...process.env,
  PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL',
  ComSpec: 'C:\\Windows\\System32\\cmd.exe'
}

const steps = []
const screenshots = []
let backendProcess = null
let frontendProcess = null
let backendLog = null
let frontendLog = null

function log(message) {
  console.log(message)
}

function pass(name, detail) {
  steps.push({ name, result: 'pass', detail })
  log(`PASS ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail) {
  steps.push({ name, result: 'fail', detail })
  log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  throw new Error(`${name}: ${detail}`)
}

function assert(condition, name, detail) {
  if (!condition) {
    fail(name, detail || 'assertion failed')
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForUrl(url, timeoutMs = 120000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return response
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function waitForBackendDown(timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      await fetch(`${backendUrl}/api/employees?page=1&pageSize=1`)
      await delay(300)
    } catch {
      return
    }
  }
  throw new Error('backend did not stop')
}

function startBackend() {
  backendLog = fs.createWriteStream(path.join(artifactDir, 'backend.log'), { flags: 'a' })
  backendProcess = spawn(javaBin, ['-jar', jarPath], {
    cwd: backendDir,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  backendProcess.stdout.pipe(backendLog)
  backendProcess.stderr.pipe(backendLog)
  backendProcess.on('exit', (code) => {
    backendLog?.write(`\n[backend exited with code ${code}]\n`)
  })
  return waitForUrl(`${backendUrl}/api/employees?page=1&pageSize=1`)
}

async function stopBackend() {
  const proc = backendProcess
  backendProcess = null
  if (!proc) {
    return
  }
  const exited = new Promise((resolve) => proc.once('exit', resolve))
  proc.kill()
  await Promise.race([exited, delay(10000)])
  await waitForBackendDown()
}

function startFrontend() {
  frontendLog = fs.createWriteStream(path.join(artifactDir, 'frontend.log'), { flags: 'a' })
  const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js')
  frontendProcess = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173'], {
    cwd: frontendDir,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  frontendProcess.stdout.pipe(frontendLog)
  frontendProcess.stderr.pipe(frontendLog)
  return waitForUrl(frontendUrl)
}

async function api(pathname, options = {}) {
  const response = await fetch(`${backendUrl}/api${pathname}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const body = await response.json()
  return { status: response.status, body }
}

async function createEmployeeViaApi(employeeNo, name) {
  const result = await api('/employees', {
    method: 'POST',
    body: JSON.stringify({
      employeeNo,
      name,
      gender: 'MALE',
      department: '数据部',
      position: '分析师',
      phone: '13900139000',
      email: `${employeeNo.toLowerCase()}@example.com`,
      hireDate: '2023-01-10',
      status: 'ACTIVE'
    })
  })
  assert(result.status === 201, '准备分页数据', `POST /employees returned ${result.status}`)
  return result.body.data
}

async function screenshot(page, name) {
  const target = path.join(screenshotDir, `${name}.png`)
  await page.screenshot({ path: target, fullPage: true })
  screenshots.push(`.opencode/delivery/screenshots/${name}.png`)
}

async function fillRequired(page, values) {
  await page.locator('input[name="employeeNo"]').fill(values.employeeNo)
  await page.locator('input[name="name"]').fill(values.name)
  await page.getByRole('radio', { name: values.gender, exact: true }).check({ force: true })
  await page.locator('input[name="department"]').fill(values.department)
}

async function setStatus(page, label) {
  await page.getByRole('radio', { name: label, exact: true }).check({ force: true })
}

async function run() {
  fs.mkdirSync(screenshotDir, { recursive: true })
  fs.mkdirSync(artifactDir, { recursive: true })
  if (!fs.existsSync(jarPath)) {
    throw new Error(`backend jar not found: ${jarPath}. Run "mvn -f backend/pom.xml package" first.`)
  }

  fs.rmSync(path.join(backendDir, 'data'), { recursive: true, force: true })
  fs.rmSync(path.join(artifactDir, 'backend.log'), { force: true })
  fs.rmSync(path.join(artifactDir, 'frontend.log'), { force: true })
  fs.writeFileSync(path.join(artifactDir, 'e2e-started.txt'), new Date().toISOString())

  await startBackend()
  await startFrontend()

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  let postCount = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/employees')) {
      postCount += 1
    }
  })

  try {
    // 1. Empty state
    await page.goto(`${frontendUrl}/employees`)
    await page.getByText('暂无员工数据').waitFor({ timeout: 15000 })
    await screenshot(page, '01-empty-list')
    pass('空库进入列表页展示空状态', '页面显示「暂无员工数据」，无未捕获异常')

    // 2. Navigate to create page
    await page.getByRole('button', { name: '新增员工' }).click()
    await page.waitForURL(/\/employees\/new$/)
    await page.getByRole('heading', { name: '新增员工' }).waitFor()
    pass('列表页进入新增员工页', 'URL=/employees/new，标题「新增员工」')

    // 3. Frontend validation blocks request
    postCount = 0
    await page.getByRole('button', { name: '提交', exact: true }).click()
    await page.getByText('工号不能为空').waitFor()
    await page.getByText('姓名不能为空').waitFor()
    await page.getByText('请选择性别').waitFor()
    await page.getByText('部门不能为空').waitFor()
    await delay(400)
    assert(postCount === 0, '必填校验', `expected 0 POST, got ${postCount}`)
    await screenshot(page, '02-create-required-errors')
    pass('必填项留空提交被前端拦截', '4 个必填错误提示可见，POST 请求数=0')

    // 4. Invalid phone / email
    postCount = 0
    await page.locator('input[name="employeeNo"]').fill('EMP001')
    await page.locator('input[name="name"]').fill('张三')
    await page.getByRole('radio', { name: '男', exact: true }).check({ force: true })
    await page.locator('input[name="department"]').fill('研发部')
    await page.locator('input[name="position"]').fill('工程师')
    await page.locator('input[name="phone"]').fill('123')
    await page.locator('input[name="email"]').fill('a@')
    await page.getByRole('button', { name: '提交', exact: true }).click()
    await page.getByText('手机号必须为11位数字').waitFor()
    await page.getByText('邮箱格式不正确').waitFor()
    await delay(300)
    assert(postCount === 0, '格式校验', `expected 0 POST, got ${postCount}`)
    await screenshot(page, '03-create-format-errors')
    pass('非法手机号与邮箱被前端拦截', '提示具体原因，POST 请求数=0')

    // 4b. Backend 400 field error is mapped to the matching input
    await page.locator('input[name="phone"]').fill('13800138000')
    await page.locator('input[name="email"]').fill('zhangsan@example.com')
    const postPattern = /\/api\/employees$/
    let mocked400 = false
    await page.route(postPattern, async (route) => {
      if (route.request().method() === 'POST' && !mocked400) {
        mocked400 = true
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 40001,
            message: '参数校验失败',
            data: [{ field: 'name', message: '后端姓名错误' }]
          })
        })
        return
      }
      await route.continue()
    })
    await page.getByRole('button', { name: '提交', exact: true }).click()
    await page.getByText('后端姓名错误').waitFor({ timeout: 10000 })
    assert(page.url().endsWith('/employees/new'), '400 不跳转', page.url())
    await page.unroute(postPattern)
    pass('后端 400 字段级错误映射到输入项', '姓名输入项下显示「后端姓名错误」，页面未跳转')

    // 5. Successful create
    await page.locator('input[name="phone"]').fill('13800138000')
    await page.locator('input[name="email"]').fill('zhangsan@example.com')
    const dateInput = page.getByPlaceholder('选择入职日期（选填）')
    await dateInput.fill('2024-05-01')
    await dateInput.press('Enter')
    await page.keyboard.press('Escape')
    const activeChecked = await page.getByRole('radio', { name: '在职', exact: true }).isChecked()
    assert(activeChecked, '默认状态', '新增页状态默认不是在职')
    postCount = 0
    await page.getByRole('button', { name: '提交', exact: true }).evaluate((button) => {
      button.click()
      button.click()
    })
    await page.getByText('新增成功').waitFor({ timeout: 10000 })
    await page.waitForURL(/\/employees$/)
    await delay(500)
    assert(postCount === 1, '防止重复提交', `expected 1 POST after double click, got ${postCount}`)
    await page.getByText('张三').waitFor()
    const listAfterCreate = await api('/employees?page=1&pageSize=10')
    assert(listAfterCreate.body.data.total === 1, '新增后列表', `total=${listAfterCreate.body.data.total}`)
    const created = listAfterCreate.body.data.list[0]
    assert(created.employeeNo === 'EMP001', '新增字段', `employeeNo=${created.employeeNo}`)
    assert(created.status === 'ACTIVE', '新增默认状态', `status=${created.status}`)
    assert(created.hireDate === '2024-05-01', '入职日期', `hireDate=${created.hireDate}`)
    await screenshot(page, '04-list-after-create')
    pass('新增合法员工并跳转列表', `id=${created.id}，列表可见张三，状态=在职；双击提交仅 1 次请求，createdAt=${created.createdAt}`)

    // 6. Duplicate employee number
    await page.getByRole('button', { name: '新增员工' }).click()
    await page.waitForURL(/\/employees\/new$/)
    await fillRequired(page, { employeeNo: 'EMP001', name: '李四', gender: '男', department: '研发部' })
    postCount = 0
    await page.getByRole('button', { name: '提交', exact: true }).click()
    await page.getByText('工号已存在').waitFor({ timeout: 10000 })
    await delay(300)
    assert(postCount === 1, '重复工号请求', `expected 1 POST, got ${postCount}`)
    assert(page.url().endsWith('/employees/new'), '重复工号不跳转', page.url())
    assert((await page.locator('input[name="name"]').inputValue()) === '李四', '重复工号保留输入', 'name lost')
    await screenshot(page, '05-duplicate-employee-no')
    pass('重复工号返回 409 并在工号字段提示', '提示「工号已存在」，页面停留且输入保留')
    await page.getByRole('button', { name: '返回列表' }).click()
    await page.waitForURL(/\/employees$/)

    // 7. Edit page prefill and save
    const createdAtBefore = created.createdAt
    await page.getByRole('button', { name: '编辑' }).first().click()
    await page.waitForURL(new RegExp(`/employees/${created.id}/edit$`))
    await page.getByRole('heading', { name: '编辑员工' }).waitFor()
    const employeeNoInput = page.locator('input[name="employeeNo"]')
    assert(await employeeNoInput.isDisabled(), '工号只读', 'employeeNo input is editable')
    assert((await employeeNoInput.inputValue()) === 'EMP001', '工号回显', 'employeeNo mismatch')
    assert((await page.locator('input[name="name"]').inputValue()) === '张三', '姓名回显', 'name mismatch')
    await screenshot(page, '06-edit-prefilled')

    // 7b. Record removed between load and save -> PUT 404
    const putPattern = new RegExp(`/api/employees/${created.id}$`)
    await page.route(putPattern, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 40401, message: '员工不存在或已被移除', data: null })
        })
        return
      }
      await route.continue()
    })
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await page.getByText('员工不存在或已被移除').waitFor({ timeout: 10000 })
    assert((await page.getByRole('button', { name: '保存', exact: true }).count()) === 0,
      '提交 404 后隐藏表单', 'save button still rendered')
    await page.unroute(putPattern)
    await screenshot(page, '06b-edit-submit-404')
    pass('提交时记录已被移除（404）', '提示「员工不存在或已被移除」并隐藏表单')

    // Re-open the edit page, simulate network failure, keep input, then retry.
    await page.goto(`${frontendUrl}/employees/${created.id}/edit`)
    await page.locator('input[name="name"]').waitFor()
    const putPatternNetwork = new RegExp(`/api/employees/${created.id}$`)
    let abortedOnce = false
    await page.route(putPatternNetwork, async (route) => {
      if (route.request().method() === 'PUT' && !abortedOnce) {
        abortedOnce = true
        await route.abort('failed')
        return
      }
      await route.continue()
    })
    await page.locator('input[name="name"]').fill('李四')
    await page.locator('input[name="department"]').fill('测试部')
    await setStatus(page, '离职')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await page.getByText('网络异常，请检查后端服务是否可用').waitFor({ timeout: 10000 })
    assert((await page.locator('input[name="name"]').inputValue()) === '李四', '网络失败保留输入', 'name lost')
    await page.unroute(putPatternNetwork)
    await screenshot(page, '06c-edit-network-error')
    pass('保存时网络异常保留输入', '显示网络异常提示，姓名字段仍为李四')

    await page.getByRole('button', { name: '保存', exact: true }).click()
    await page.getByText('保存成功').waitFor({ timeout: 10000 })
    await page.waitForURL(/\/employees$/)
    const row = page.locator('.el-table__body tr').filter({ hasText: '李四' })
    await row.waitFor()
    assert((await row.innerText()).includes('测试部'), '编辑后列表部门', await row.innerText())
    assert((await row.innerText()).includes('离职'), '编辑后列表状态', await row.innerText())
    const afterEdit = await api(`/employees/${created.id}`)
    assert(afterEdit.body.data.name === '李四', '编辑接口姓名', afterEdit.body.data.name)
    assert(afterEdit.body.data.createdAt === createdAtBefore, 'createdAt 不变', `${afterEdit.body.data.createdAt} != ${createdAtBefore}`)
    assert(afterEdit.body.data.updatedAt >= createdAtBefore, 'updatedAt 更新', afterEdit.body.data.updatedAt)
    await screenshot(page, '07-list-after-edit')
    pass('编辑回显并保存成功', `createdAt 保持 ${createdAtBefore}，updatedAt=${afterEdit.body.data.updatedAt}`)

    // 7c. Optional fields empty -> placeholder '-' and default ACTIVE status
    const emptyRecord = await api('/employees', {
      method: 'POST',
      body: JSON.stringify({
        employeeNo: 'EMPEMPTY',
        name: '空值员工',
        gender: 'FEMALE',
        department: '行政部'
      })
    })
    assert(emptyRecord.status === 201, '必填字段创建', `status=${emptyRecord.status}`)
    assert(emptyRecord.body.data.status === 'ACTIVE', '缺省状态', `status=${emptyRecord.body.data.status}`)
    await page.goto(`${frontendUrl}/employees`)
    const emptyRow = page.locator('.el-table__body tr').filter({ hasText: '空值员工' })
    await emptyRow.waitFor()
    const emptyCells = await emptyRow.locator('td').allInnerTexts()
    for (const index of [4, 5, 6, 7]) {
      assert(emptyCells[index].trim() === '-', '空值占位符', `column ${index} = ${emptyCells[index]}`)
    }
    assert(emptyCells[8].includes('在职'), '默认状态展示', emptyCells[8])
    pass('选填字段为空展示占位符', '岗位/手机号/邮箱/入职日期显示「-」，状态默认在职')

    // 8. Edit unknown id
    await page.goto(`${frontendUrl}/employees/999999/edit`)
    await page.getByText('员工不存在或已被移除').waitFor({ timeout: 10000 })
    assert((await page.getByRole('button', { name: '保存', exact: true }).count()) === 0,
      '不存在 id 不渲染表单', 'save button rendered')
    await screenshot(page, '08-edit-not-found')
    pass('访问不存在 id 的编辑页', '显示「员工不存在或已被移除」，无保存按钮')
    await page.locator('.state-box').getByRole('button', { name: '返回列表' }).click()
    await page.waitForURL(/\/employees$/)

    // 9. Pagination
    for (let i = 1; i <= 11; i += 1) {
      await createEmployeeViaApi(`PAGE${String(i).padStart(3, '0')}`, `分页员工${i}`)
    }
    await page.goto(`${frontendUrl}/employees`)
    await page.locator('.el-table__body tr').first().waitFor()
    let rows = await page.locator('.el-table__body tr').count()
    assert(rows === 10, '第一页 10 条', `rows=${rows}`)
    let totalText = await page.locator('.el-pagination__total').innerText()
    assert(totalText.includes('13'), '总数 13', totalText)
    await screenshot(page, '09-pagination-page1')
    pass('13 条数据首屏展示 10 条', `${totalText}，表格行数=${rows}`)

    const pageRequests = []
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().includes('/api/employees?')) {
        pageRequests.push(request.url())
      }
    })
    const page2Response = page.waitForResponse((response) => response.url().includes('page=2'))
    await page.locator('.el-pager li.number').nth(1).click()
    await page2Response
    await delay(300)
    rows = await page.locator('.el-table__body tr').count()
    assert(rows === 3, '第二页 3 条', `rows=${rows}`)
    const secondPageRequest = pageRequests[pageRequests.length - 1] || ''
    assert(secondPageRequest.includes('page=2') && secondPageRequest.includes('pageSize=10'),
      '翻页请求参数', secondPageRequest)
    pass('切换到第 2 页', `行数=3，请求=${secondPageRequest}`)

    // 9b. Out-of-range page: simulate records removed while staying on page 2,
    //     the next page-2 response has total=10 and an empty list.
    const page2Pattern = /\/api\/employees\?page=2&pageSize=10$/
    let mockedOnce = false
    await page.route(page2Pattern, async (route) => {
      if (!mockedOnce) {
        mockedOnce = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            message: 'ok',
            data: { list: [], total: 10, page: 2, pageSize: 10 }
          })
        })
        return
      }
      await route.continue()
    })
    await page.locator('.el-pager li.number').nth(0).click()
    await delay(500)
    const mockedPage2 = page.waitForResponse((response) => response.url().includes('page=2'))
    await page.locator('.el-pager li.number').nth(1).click()
    await mockedPage2
    await page.getByText('当前页码超出范围，已回到有效页码').waitFor({ timeout: 10000 })
    await delay(600)
    const activePage = await page.locator('.el-pager li.is-active').innerText()
    assert(activePage.trim() === '1', '超出页码回退', `active page=${activePage}`)
    rows = await page.locator('.el-table__body tr').count()
    assert(rows === 10, '回退后展示有效页', `rows=${rows}`)
    await screenshot(page, '10-out-of-range-page')
    pass('翻页超出范围时回到有效页码', '提示后回到第 1 页，展示 10 条数据')
    await page.unroute(page2Pattern)

    // 9c. Page size 20
    const size20Response = page.waitForResponse((response) => response.url().includes('pageSize=20'))
    await page.locator('.el-pagination .el-select').click()
    await page.locator('.el-select-dropdown__item').filter({ hasText: '20' }).click()
    await size20Response
    await delay(300)
    rows = await page.locator('.el-table__body tr').count()
    assert(rows === 13, '每页 20 条展示 13 条', `rows=${rows}`)
    pass('切换每页条数为 20', `重新请求 pageSize=20，行数=${rows}`)

    // 10. Backend down -> error + retry -> recovery
    await page.reload()
    await page.locator('.el-table__body tr').first().waitFor()
    await stopBackend()
    await page.reload()
    await page.getByText('加载员工列表失败').waitFor({ timeout: 20000 })
    await page.getByRole('button', { name: '重试' }).waitFor()
    await screenshot(page, '11-backend-down')
    pass('后端停止后列表展示错误与重试', '错误提示与「重试」按钮可见')

    await page.getByRole('button', { name: '重试' }).click()
    await delay(800)
    assert((await page.getByText('加载员工列表失败').count()) === 1, '后端未恢复时重试', 'error alert disappeared')
    pass('后端未恢复时重试仍提示错误', '错误提示保持可见')

    await startBackend()
    await page.getByRole('button', { name: '重试' }).click()
    await page.locator('.el-table__body tr').first().waitFor({ timeout: 20000 })
    assert((await page.getByText('加载员工列表失败').count()) === 0, '恢复后重试', 'error alert still visible')
    await screenshot(page, '12-backend-restored')
    pass('后端恢复后点击重试加载成功', '表格重新显示数据')

    // 11. Persistence across backend restart
    await stopBackend()
    await startBackend()
    const persisted = await api('/employees?page=1&pageSize=10')
    assert(persisted.body.data.total === 13, '重启后数据保留', `total=${persisted.body.data.total}`)
    await page.goto(`${frontendUrl}/employees`)
    await page.locator('.el-table__body tr').first().waitFor()
    await screenshot(page, '13-after-restart')
    pass('服务重启后数据仍可查询', 'total=13，列表正常展示')

    assert(pageErrors.length === 0, '页面未捕获异常', pageErrors.join(' | '))
    pass('页面无未捕获异常', 'pageerror 事件数=0')

    fs.writeFileSync(path.join(deliveryDir, 'e2e-results.json'), JSON.stringify({
      finishedAt: new Date().toISOString(),
      result: 'pass',
      steps,
      screenshots
    }, null, 2))
    log(`\nE2E PASSED: ${steps.length} checks, ${screenshots.length} screenshots`)
  } catch (error) {
    fs.writeFileSync(path.join(deliveryDir, 'e2e-results.json'), JSON.stringify({
      finishedAt: new Date().toISOString(),
      result: 'fail',
      error: error instanceof Error ? error.message : String(error),
      steps,
      screenshots
    }, null, 2))
    throw error
  } finally {
    await browser.close().catch(() => {})
    if (frontendProcess) {
      frontendProcess.kill()
    }
    if (backendProcess) {
      backendProcess.kill()
    }
    backendLog?.end()
    frontendLog?.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
