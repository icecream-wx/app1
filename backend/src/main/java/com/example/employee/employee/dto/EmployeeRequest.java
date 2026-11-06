package com.example.employee.employee.dto;

import com.example.employee.employee.EmployeeStatus;
import com.example.employee.employee.Gender;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request body for both create (POST) and update (PUT).
 * Server-managed fields (id/createdAt/updatedAt) are unknown properties and are ignored.
 */
public class EmployeeRequest {

    @NotBlank(message = "工号不能为空")
    @Size(max = 32, message = "工号长度不能超过32")
    private String employeeNo;

    @NotBlank(message = "姓名不能为空")
    @Size(max = 32, message = "姓名长度不能超过32")
    private String name;

    @NotNull(message = "性别不能为空")
    private Gender gender;

    @NotBlank(message = "部门不能为空")
    @Size(max = 64, message = "部门长度不能超过64")
    private String department;

    @Size(max = 64, message = "岗位长度不能超过64")
    private String position;

    @Pattern(regexp = "^\\d{11}$", message = "手机号必须为11位数字")
    private String phone;

    @Email(message = "邮箱格式不正确")
    @Size(max = 128, message = "邮箱长度不能超过128")
    private String email;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    private EmployeeStatus status;

    public String getEmployeeNo() {
        return employeeNo;
    }

    public void setEmployeeNo(String employeeNo) {
        this.employeeNo = employeeNo;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getHireDate() {
        return hireDate;
    }

    public void setHireDate(LocalDate hireDate) {
        this.hireDate = hireDate;
    }

    public EmployeeStatus getStatus() {
        return status;
    }

    public void setStatus(EmployeeStatus status) {
        this.status = status;
    }
}
