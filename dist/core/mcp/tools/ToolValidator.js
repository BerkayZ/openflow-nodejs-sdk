"use strict";
/*
 * ToolValidator
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolValidator = void 0;
class ToolValidator {
    static validateTool(tool) {
        if (!tool.name || typeof tool.name !== "string") {
            return false;
        }
        if (!tool.description || typeof tool.description !== "string") {
            return false;
        }
        if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
            return false;
        }
        if (!tool.serverName || typeof tool.serverName !== "string") {
            return false;
        }
        return true;
    }
    static validateToolCall(toolCall, tool) {
        const errors = [];
        if (!toolCall.name || typeof toolCall.name !== "string") {
            errors.push("Tool call name is required and must be a string");
        }
        else if (toolCall.name !== tool.name) {
            errors.push(`Tool call name '${toolCall.name}' does not match tool name '${tool.name}'`);
        }
        if (toolCall.arguments === undefined || toolCall.arguments === null) {
            errors.push("Tool call arguments are required");
        }
        else {
            const validationErrors = this.validateArguments(toolCall.arguments, tool.inputSchema);
            errors.push(...validationErrors);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static validateArguments(args, schema) {
        const errors = [];
        if (!schema || typeof schema !== "object") {
            return errors;
        }
        if (schema.type === "object" && schema.properties) {
            if (typeof args !== "object" || args === null) {
                errors.push("Arguments must be an object");
                return errors;
            }
            if (schema.required && Array.isArray(schema.required)) {
                for (const requiredField of schema.required) {
                    if (!(requiredField in args)) {
                        errors.push(`Required field '${requiredField}' is missing`);
                    }
                }
            }
            for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
                if (fieldName in args) {
                    const fieldErrors = this.validateField(args[fieldName], fieldSchema, fieldName);
                    errors.push(...fieldErrors);
                }
            }
        }
        return errors;
    }
    static validateField(value, schema, fieldName) {
        const errors = [];
        if (!schema || typeof schema !== "object") {
            return errors;
        }
        if (schema.type) {
            const actualType = this.getJsonType(value);
            if (actualType !== schema.type) {
                errors.push(`Field '${fieldName}' expected type '${schema.type}' but got '${actualType}'`);
            }
        }
        if (schema.type === "string") {
            if (typeof value === "string") {
                if (schema.minLength && value.length < schema.minLength) {
                    errors.push(`Field '${fieldName}' must have at least ${schema.minLength} characters`);
                }
                if (schema.maxLength && value.length > schema.maxLength) {
                    errors.push(`Field '${fieldName}' must have at most ${schema.maxLength} characters`);
                }
                if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                    errors.push(`Field '${fieldName}' does not match required pattern`);
                }
            }
        }
        if (schema.type === "number" || schema.type === "integer") {
            if (typeof value === "number") {
                if (schema.minimum !== undefined && value < schema.minimum) {
                    errors.push(`Field '${fieldName}' must be at least ${schema.minimum}`);
                }
                if (schema.maximum !== undefined && value > schema.maximum) {
                    errors.push(`Field '${fieldName}' must be at most ${schema.maximum}`);
                }
                if (schema.type === "integer" && !Number.isInteger(value)) {
                    errors.push(`Field '${fieldName}' must be an integer`);
                }
            }
        }
        if (schema.type === "array") {
            if (Array.isArray(value)) {
                if (schema.minItems !== undefined && value.length < schema.minItems) {
                    errors.push(`Field '${fieldName}' must have at least ${schema.minItems} items`);
                }
                if (schema.maxItems !== undefined && value.length > schema.maxItems) {
                    errors.push(`Field '${fieldName}' must have at most ${schema.maxItems} items`);
                }
                if (schema.items) {
                    value.forEach((item, index) => {
                        const itemErrors = this.validateField(item, schema.items, `${fieldName}[${index}]`);
                        errors.push(...itemErrors);
                    });
                }
            }
        }
        if (schema.enum && !schema.enum.includes(value)) {
            errors.push(`Field '${fieldName}' must be one of: ${schema.enum.join(", ")}`);
        }
        return errors;
    }
    static getJsonType(value) {
        if (value === null)
            return "null";
        if (Array.isArray(value))
            return "array";
        if (typeof value === "object")
            return "object";
        return typeof value;
    }
}
exports.ToolValidator = ToolValidator;
