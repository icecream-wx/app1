package com.example.employee.common;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleValidation(BindException ex) {
        Map<String, String> fieldMessages = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fieldMessages.putIfAbsent(error.getField(), defaultMessage(error.getDefaultMessage())));
        List<FieldErrorItem> fields = fieldMessages.entrySet().stream()
                .map(entry -> new FieldErrorItem(entry.getKey(), entry.getValue()))
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(40001, "参数校验失败", fields));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(40001, ex.getMessage(), ex.getFields()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleUnreadable(HttpMessageNotReadableException ex) {
        InvalidFormatException invalidFormat = findCause(ex, InvalidFormatException.class);
        if (invalidFormat != null) {
            String field = fieldName(invalidFormat);
            String message = messageFor(field, invalidFormat.getTargetType());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(40001, "参数校验失败",
                            List.of(new FieldErrorItem(field, message))));
        }
        JsonMappingException mapping = findCause(ex, JsonMappingException.class);
        if (mapping != null) {
            String field = fieldName(mapping);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(40001, "参数校验失败",
                            List.of(new FieldErrorItem(field, "字段格式不正确"))));
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(40001, "请求体格式错误", List.of()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        if ("id".equals(ex.getName())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(40401, "员工不存在或已被移除", List.of()));
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(40001, "参数校验失败",
                        List.of(new FieldErrorItem(ex.getName(), "参数格式不正确"))));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(40001, "参数校验失败",
                        List.of(new FieldErrorItem(ex.getParameterName(), "参数不能为空"))));
    }

    @ExceptionHandler(EmployeeNotFoundException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleNotFound(EmployeeNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(40401, ex.getMessage()));
    }

    @ExceptionHandler(DuplicateEmployeeNoException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleDuplicate(DuplicateEmployeeNoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(40901, "工号已存在"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(40901, "工号已存在"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<List<FieldErrorItem>>> handleUnexpected(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(50000, "服务器内部错误", List.of()));
    }

    private static String fieldName(JsonMappingException ex) {
        List<JsonMappingException.Reference> path = ex.getPath();
        if (path == null || path.isEmpty()) {
            return "body";
        }
        String field = path.get(path.size() - 1).getFieldName();
        return field == null ? "body" : field;
    }

    private static String messageFor(String field, Class<?> targetType) {
        if ("hireDate".equals(field)) {
            return "入职日期格式必须为 yyyy-MM-dd";
        }
        if ("gender".equals(field)) {
            return "性别取值非法，可选值：MALE、FEMALE";
        }
        if ("status".equals(field)) {
            return "状态取值非法，可选值：ACTIVE、INACTIVE";
        }
        if (targetType != null && targetType.isEnum()) {
            return "字段取值非法";
        }
        return "字段格式不正确";
    }

    private static <T extends Throwable> T findCause(Throwable ex, Class<T> type) {
        Throwable current = ex;
        while (current != null) {
            if (type.isInstance(current)) {
                return type.cast(current);
            }
            current = current.getCause();
        }
        return null;
    }

    private static String defaultMessage(String message) {
        return message == null || message.isBlank() ? "字段不合法" : message;
    }
}
