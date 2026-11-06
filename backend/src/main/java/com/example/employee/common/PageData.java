package com.example.employee.common;

import com.example.employee.employee.Employee;

import java.util.List;

public record PageData(List<Employee> list, long total, int page, int pageSize) {
}
