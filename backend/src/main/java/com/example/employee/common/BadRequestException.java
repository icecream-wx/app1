package com.example.employee.common;

import java.util.List;

public class BadRequestException extends RuntimeException {

    private final List<FieldErrorItem> fields;

    public BadRequestException(List<FieldErrorItem> fields) {
        super("参数校验失败");
        this.fields = fields;
    }

    public static BadRequestException single(String field, String message) {
        return new BadRequestException(List.of(new FieldErrorItem(field, message)));
    }

    public List<FieldErrorItem> getFields() {
        return fields;
    }
}
