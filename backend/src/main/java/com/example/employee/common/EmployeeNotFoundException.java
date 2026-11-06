package com.example.employee.common;

public class EmployeeNotFoundException extends RuntimeException {

    public EmployeeNotFoundException(Long id) {
        super("员工不存在或已被移除");
        this.id = id;
    }

    private final Long id;

    public Long getId() {
        return id;
    }
}
