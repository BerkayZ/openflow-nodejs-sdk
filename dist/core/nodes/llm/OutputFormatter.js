"use strict";
/*
 * OutputFormatter
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputFormatter = void 0;
const types_1 = require("../../types");
class OutputFormatter {
    static validateAndFormat(output, schema) {
        const result = {};
        for (const [key, property] of Object.entries(schema)) {
            result[key] = this.validateProperty(output[key], property, key);
        }
        return result;
    }
    static validateProperty(value, property, fieldName) {
        switch (property.type) {
            case types_1.DataType.STRING:
                return this.validateString(value, fieldName);
            case types_1.DataType.NUMBER:
                return this.validateNumber(value, fieldName);
            case types_1.DataType.BOOLEAN:
                return this.validateBoolean(value, fieldName);
            case types_1.DataType.ARRAY:
                return this.validateArray(value, property, fieldName);
            case types_1.DataType.OBJECT:
                return this.validateObject(value, property, fieldName);
            default:
                throw new Error(`Unsupported data type: ${property.type}`);
        }
    }
    static validateString(value, fieldName) {
        if (value === undefined || value === null) {
            throw new Error(`Missing required string field: ${fieldName}`);
        }
        return String(value);
    }
    static validateNumber(value, fieldName) {
        if (value === undefined || value === null) {
            throw new Error(`Missing required number field: ${fieldName}`);
        }
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(`Invalid number for field: ${fieldName}`);
        }
        return num;
    }
    static validateBoolean(value, fieldName) {
        if (value === undefined || value === null) {
            throw new Error(`Missing required boolean field: ${fieldName}`);
        }
        return Boolean(value);
    }
    static validateArray(value, property, fieldName) {
        if (!Array.isArray(value)) {
            throw new Error(`Expected array for field: ${fieldName}`);
        }
        if (property.items) {
            return value.map((item, index) => this.validateProperty(item, property.items, `${fieldName}[${index}]`));
        }
        return value;
    }
    static validateObject(value, property, fieldName) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error(`Expected object for field: ${fieldName}`);
        }
        if (property.structure) {
            const result = {};
            for (const [key, subProperty] of Object.entries(property.structure)) {
                result[key] = this.validateProperty(value[key], subProperty, `${fieldName}.${key}`);
            }
            return result;
        }
        return value;
    }
    static generateExampleOutput(schema) {
        const result = {};
        for (const [key, property] of Object.entries(schema)) {
            result[key] = this.generateExampleProperty(property);
        }
        return result;
    }
    static generateExampleProperty(property) {
        switch (property.type) {
            case types_1.DataType.STRING:
                return "string";
            case types_1.DataType.NUMBER:
                return 0;
            case types_1.DataType.BOOLEAN:
                return true;
            case types_1.DataType.ARRAY:
                if (property.items) {
                    return [this.generateExampleProperty(property.items)];
                }
                return [];
            case types_1.DataType.OBJECT:
                if (property.structure) {
                    const obj = {};
                    for (const [key, subProperty] of Object.entries(property.structure)) {
                        obj[key] = this.generateExampleProperty(subProperty);
                    }
                    return obj;
                }
                return {};
            default:
                return null;
        }
    }
}
exports.OutputFormatter = OutputFormatter;
