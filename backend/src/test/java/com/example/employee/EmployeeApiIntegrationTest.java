package com.example.employee;

import com.example.employee.employee.Employee;
import com.example.employee.employee.EmployeeRepository;
import com.example.employee.employee.EmployeeStatus;
import com.example.employee.employee.Gender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:employee-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class EmployeeApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository repository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void createReturns201WithServerManagedFieldsAndIsQueryable() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson("EMP001", "张三")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("ok"))
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.employeeNo").value("EMP001"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asLong();

        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(10))
                .andExpect(jsonPath("$.data.list", hasSize(1)))
                .andExpect(jsonPath("$.data.list[0].id").value(id));

        mockMvc.perform(get("/api/employees/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.employeeNo").value("EMP001"))
                .andExpect(jsonPath("$.data.gender").value("MALE"))
                .andExpect(jsonPath("$.data.hireDate").value("2024-05-01"));
    }

    @Test
    void clientSuppliedServerFieldsAndUnknownFieldsAreIgnored() throws Exception {
        Map<String, Object> body = validBody("EMP010", "王五");
        body.put("id", 999);
        body.put("createdAt", "2000-01-01T00:00:00");
        body.put("unknownField", "ignored");

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(org.hamcrest.Matchers.not(999)))
                .andExpect(jsonPath("$.data.createdAt").value(org.hamcrest.Matchers.not("2000-01-01T00:00:00")));
    }

    @Test
    void duplicateEmployeeNoOnCreateReturns409AndDoesNotInsert() throws Exception {
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson("EMP002", "李四")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson("EMP002", "李四副本")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(40901))
                .andExpect(jsonPath("$.message").value("工号已存在"))
                .andExpect(jsonPath("$.data").doesNotExist());

        mockMvc.perform(get("/api/employees"))
                .andExpect(jsonPath("$.data.total").value(1));
    }

    @Test
    void updateReturns200KeepsCreatedAtAndChangesUpdatedAt() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson("EMP003", "王五")))
                .andReturn();
        JsonNode initial = objectMapper.readTree(created.getResponse().getContentAsString()).path("data");
        long id = initial.path("id").asLong();

        Map<String, Object> update = validBody("EMP003", "王小五");
        update.put("department", "平台部");
        update.put("status", "INACTIVE");

        MvcResult updated = mockMvc.perform(put("/api/employees/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.name").value("王小五"))
                .andExpect(jsonPath("$.data.department").value("平台部"))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"))
                .andReturn();

        JsonNode after = objectMapper.readTree(updated.getResponse().getContentAsString()).path("data");
        assertThat(after.path("createdAt").asText()).isEqualTo(initial.path("createdAt").asText());
        assertThat(after.path("updatedAt").asText()).isGreaterThanOrEqualTo(initial.path("createdAt").asText());
    }

    @Test
    void updateToExistingEmployeeNoReturns409AndKeepsOriginal() throws Exception {
        long firstId = createEmployee("EMP004", "甲");
        long secondId = createEmployee("EMP005", "乙");

        Map<String, Object> update = validBody("EMP004", "乙改名");
        mockMvc.perform(put("/api/employees/{id}", secondId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("工号已存在"));

        mockMvc.perform(get("/api/employees/{id}", secondId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.employeeNo").value("EMP005"))
                .andExpect(jsonPath("$.data.name").value("乙"));

        mockMvc.perform(get("/api/employees/{id}", firstId))
                .andExpect(jsonPath("$.data.name").value("甲"));
    }

    @Test
    void missingRequiredFieldsReturn400WithFieldNames() throws Exception {
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"\",\"name\":\"\",\"department\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40001))
                .andExpect(jsonPath("$.data[*].field",
                        containsInAnyOrder("employeeNo", "name", "gender", "department")));

        mockMvc.perform(get("/api/employees"))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void invalidFieldValuesReturn400WithFieldName() throws Exception {
        assertInvalid(validJson("EMP006", "张三").replace("\"phone\":\"13800138000\"", "\"phone\":\"123\""), "phone");
        assertInvalid(validJson("EMP007", "张三").replace("\"email\":\"a@b.com\"", "\"email\":\"a@\""), "email");
        assertInvalid(validJson("EMP008", "张三").replace("\"hireDate\":\"2024-05-01\"", "\"hireDate\":\"2024/05/01\""), "hireDate");
        assertInvalid(validJson("EMP009", "张三").replace("\"gender\":\"MALE\"", "\"gender\":\"OTHER\""), "gender");
        assertInvalid(validJson("EMP011", "张三").replace("\"status\":\"ACTIVE\"", "\"status\":\"UNKNOWN\""), "status");
        assertInvalid(validJson("EMP012", "张三").replace("\"name\":\"张三\"", "\"name\":\"" + "长".repeat(33) + "\""), "name");
        assertInvalid(validJson("EMP013", "张三").replace("\"department\":\"研发部\"",
                "\"department\":\"" + "部".repeat(65) + "\""), "department");

        mockMvc.perform(get("/api/employees"))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void paginationBoundariesFollowContract() throws Exception {
        for (int i = 1; i <= 12; i++) {
            createEmployee(String.format("PAGE%03d", i), "员工" + i);
        }

        mockMvc.perform(get("/api/employees").param("page", "1").param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(12))
                .andExpect(jsonPath("$.data.list", hasSize(10)))
                .andExpect(jsonPath("$.data.list[0].id").value(org.hamcrest.Matchers.greaterThan(0)));

        mockMvc.perform(get("/api/employees").param("page", "2").param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list", hasSize(2)));

        mockMvc.perform(get("/api/employees").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data[0].field").value("page"));

        mockMvc.perform(get("/api/employees").param("pageSize", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data[0].field").value("pageSize"));

        mockMvc.perform(get("/api/employees").param("page", "abc"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/employees").param("pageSize", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data[0].field").value("pageSize"));
    }

    @Test
    void defaultPaginationIsTenItemsSortedByIdDescending() throws Exception {
        long first = createEmployee("SORT001", "先建");
        createEmployee("SORT002", "后建");

        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(10))
                .andExpect(jsonPath("$.data.list[0].employeeNo").value("SORT002"))
                .andExpect(jsonPath("$.data.list[1].employeeNo").value("SORT001"))
                .andExpect(jsonPath("$.data.list[1].id").value(first));
    }

    @Test
    void unknownIdReturns404ForGetAndPut() throws Exception {
        mockMvc.perform(get("/api/employees/{id}", 999999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40401));

        mockMvc.perform(get("/api/employees/abc"))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/employees/{id}", 999999)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson("EMP014", "无名")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40401));

        mockMvc.perform(get("/api/employees"))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void updateWithoutStatusReturns400AndKeepsRecord() throws Exception {
        long id = createEmployee("EMP015", "赵六");
        Map<String, Object> update = validBody("EMP015", "赵六改");
        update.remove("status");

        mockMvc.perform(put("/api/employees/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data[*].field", hasItem("status")));

        mockMvc.perform(get("/api/employees/{id}", id))
                .andExpect(jsonPath("$.data.name").value("赵六"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    private void assertInvalid(String body, String field) throws Exception {
        mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40001))
                .andExpect(jsonPath("$.data[*].field", hasItems(field)));
    }

    private long createEmployee(String employeeNo, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson(employeeNo, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private Map<String, Object> validBody(String employeeNo, String name) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("employeeNo", employeeNo);
        body.put("name", name);
        body.put("gender", "MALE");
        body.put("department", "研发部");
        body.put("position", "工程师");
        body.put("phone", "13800138000");
        body.put("email", "a@b.com");
        body.put("hireDate", "2024-05-01");
        body.put("status", "ACTIVE");
        return body;
    }

    private String validJson(String employeeNo, String name) throws Exception {
        return objectMapper.writeValueAsString(validBody(employeeNo, name));
    }

    @SuppressWarnings("unused")
    private Employee sampleEmployee() {
        Employee employee = new Employee();
        employee.setEmployeeNo("SAMPLE");
        employee.setName("样本");
        employee.setGender(Gender.MALE);
        employee.setDepartment("研发部");
        employee.setHireDate(LocalDate.of(2024, 5, 1));
        employee.setStatus(EmployeeStatus.ACTIVE);
        return employee;
    }
}
