/*
 * OutputFormatter
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { OutputSchema, OutputProperty, DataType } from "../../types";

export class OutputFormatter {
  static validateAndFormat(output: any, schema: OutputSchema): any {
    const result: any = {};

    for (const [key, property] of Object.entries(schema)) {
      result[key] = this.validateProperty(output[key], property, key);
    }

    return result;
  }

  private static validateProperty(
    value: any,
    property: OutputProperty,
    fieldName: string,
  ): any {
    switch (property.type) {
      case DataType.STRING:
        return this.validateString(value, fieldName);

      case DataType.NUMBER:
        return this.validateNumber(value, fieldName);

      case DataType.BOOLEAN:
        return this.validateBoolean(value, fieldName);

      case DataType.ARRAY:
        return this.validateArray(value, property, fieldName);

      case DataType.OBJECT:
        return this.validateObject(value, property, fieldName);

      default:
        throw new Error(`Unsupported data type: ${property.type}`);
    }
  }

  private static validateString(value: any, fieldName: string): string {
    if (value === undefined || value === null) {
      throw new Error(`Missing required string field: ${fieldName}`);
    }
    return String(value);
  }

  private static validateNumber(value: any, fieldName: string): number {
    if (value === undefined || value === null) {
      throw new Error(`Missing required number field: ${fieldName}`);
    }

    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number for field: ${fieldName}`);
    }
    return num;
  }

  private static validateBoolean(value: any, fieldName: string): boolean {
    if (value === undefined || value === null) {
      throw new Error(`Missing required boolean field: ${fieldName}`);
    }
    return Boolean(value);
  }

  private static validateArray(
    value: any,
    property: OutputProperty,
    fieldName: string,
  ): any[] {
    if (!Array.isArray(value)) {
      throw new Error(`Expected array for field: ${fieldName}`);
    }

    if (property.items) {
      return value.map((item, index) =>
        this.validateProperty(item, property.items!, `${fieldName}[${index}]`),
      );
    }

    return value;
  }

  private static validateObject(
    value: any,
    property: OutputProperty,
    fieldName: string,
  ): any {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Expected object for field: ${fieldName}`);
    }

    if (property.structure) {
      const result: any = {};
      for (const [key, subProperty] of Object.entries(property.structure)) {
        result[key] = this.validateProperty(
          value[key],
          subProperty,
          `${fieldName}.${key}`,
        );
      }
      return result;
    }

    return value;
  }

  static generateExampleOutput(schema: OutputSchema): any {
    const result: any = {};

    for (const [key, property] of Object.entries(schema)) {
      result[key] = this.generateExampleProperty(property);
    }

    return result;
  }

  private static generateExampleProperty(property: OutputProperty): any {
    switch (property.type) {
      case DataType.STRING:
        return "string";

      case DataType.NUMBER:
        return 0;

      case DataType.BOOLEAN:
        return true;

      case DataType.ARRAY:
        if (property.items) {
          return [this.generateExampleProperty(property.items)];
        }
        return [];

      case DataType.OBJECT:
        if (property.structure) {
          const obj: any = {};
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
