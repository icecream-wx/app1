package com.example.employee.common;

public class DuplicateEmployeeNoException extends RuntimeException {

    public DuplicateEmployeeNoException() {
        super("工号已存在");
    }
}
