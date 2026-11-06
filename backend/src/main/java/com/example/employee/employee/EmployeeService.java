package com.example.employee.employee;

import com.example.employee.common.BadRequestException;
import com.example.employee.common.DuplicateEmployeeNoException;
import com.example.employee.common.EmployeeNotFoundException;
import com.example.employee.common.PageData;
import com.example.employee.employee.dto.EmployeeRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {

    private static final int MAX_PAGE_SIZE = 100;

    private final EmployeeRepository repository;

    public EmployeeService(EmployeeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageData list(int page, int pageSize) {
        if (page < 1) {
            throw BadRequestException.single("page", "页码必须大于等于1");
        }
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw BadRequestException.single("pageSize", "每页条数必须在1到100之间");
        }
        Page<Employee> result = repository.findAll(
                PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id")));
        return new PageData(result.getContent(), result.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public Employee get(Long id) {
        return repository.findById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
    }

    @Transactional
    public Employee create(EmployeeRequest request) {
        String employeeNo = request.getEmployeeNo().trim();
        if (repository.existsByEmployeeNo(employeeNo)) {
            throw new DuplicateEmployeeNoException();
        }
        Employee employee = new Employee();
        employee.setEmployeeNo(employeeNo);
        applyEditableFields(employee, request);
        employee.setStatus(request.getStatus() == null ? EmployeeStatus.ACTIVE : request.getStatus());
        return repository.saveAndFlush(employee);
    }

    @Transactional
    public Employee update(Long id, EmployeeRequest request) {
        Employee employee = repository.findById(id)
                .orElseThrow(() -> new EmployeeNotFoundException(id));
        if (request.getStatus() == null) {
            throw BadRequestException.single("status", "状态不能为空");
        }
        String employeeNo = request.getEmployeeNo().trim();
        if (!employeeNo.equals(employee.getEmployeeNo())
                && repository.existsByEmployeeNoAndIdNot(employeeNo, id)) {
            throw new DuplicateEmployeeNoException();
        }
        employee.setEmployeeNo(employeeNo);
        applyEditableFields(employee, request);
        employee.setStatus(request.getStatus());
        return repository.saveAndFlush(employee);
    }

    private void applyEditableFields(Employee employee, EmployeeRequest request) {
        employee.setName(request.getName().trim());
        employee.setGender(request.getGender());
        employee.setDepartment(request.getDepartment().trim());
        employee.setPosition(trimToNull(request.getPosition()));
        employee.setPhone(trimToNull(request.getPhone()));
        employee.setEmail(trimToNull(request.getEmail()));
        employee.setHireDate(request.getHireDate());
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
