package com.example.employee.employee;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    boolean existsByEmployeeNo(String employeeNo);

    boolean existsByEmployeeNoAndIdNot(String employeeNo, Long id);
}
