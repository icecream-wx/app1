package com.example.employee.common;

/**
 * Field level validation error returned inside ApiResponse.data for 400 responses.
 */
public record FieldErrorItem(String field, String message) {
}
