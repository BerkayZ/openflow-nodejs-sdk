/*
 * UpdateVariableNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { UpdateVariableNode, FlowNode } from "../../types";
import { BaseNode, NodeExecutionContext } from "../base/BaseNode";

export class UpdateVariableNodeExecutor extends BaseNode {
  /**
   * Execute UPDATE_VARIABLE node
   */
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const updateNode = node as UpdateVariableNode;

    this.log(context, "info", `Executing update node ${node.id}`);

    // Resolve config variables
    const resolvedConfig = this.resolveConfigVariables(
      updateNode.config,
      context.registry,
    );

    const { variable_id, type, join_str } = resolvedConfig;

    // Validate that target variable exists (optional check)
    this.validateTargetVariable(variable_id, context);

    // Resolve the value expression
    // Handle both string templates and object values
    const resolvedValue =
      typeof updateNode.value === "string"
        ? this.resolveValueExpression(updateNode.value, context.registry)
        : this.resolveObjectVariables(updateNode.value, context.registry);

    this.log(context, "debug", `Resolved value: ${resolvedValue}`);

    // Get current variable value
    const currentValue = context.registry.getVariable(variable_id);

    // Perform the update operation
    const newValue = this.performUpdateOperation(
      type,
      currentValue,
      resolvedValue,
      { join_str, ...resolvedConfig },
    );

    // Update the variable in registry
    context.registry.setVariable(variable_id, newValue);

    this.log(
      context,
      "info",
      `Updated variable ${variable_id} from ${currentValue} to ${newValue}`,
    );

    // Return operation details as output
    return {
      variable_id,
      previous_value: currentValue,
      new_value: newValue,
      operation: type,
      resolved_input: resolvedValue,
    };
  }

  /**
   * Validate that target variable exists (warn if not)
   */
  private validateTargetVariable(
    variableId: string,
    context: NodeExecutionContext,
  ): void {
    if (!context.registry.hasVariable(variableId)) {
      this.log(
        context,
        "warn",
        `Target variable '${variableId}' does not exist, will be created`,
      );
    }
  }

  /**
   * Perform the update operation based on type
   */
  private performUpdateOperation(
    type:
      | "join"
      | "update"
      | "append"
      | "extract"
      | "pick"
      | "omit"
      | "map"
      | "filter"
      | "slice"
      | "flatten"
      | "concat",
    currentValue: any,
    resolvedValue: any,
    config: any,
  ): any {
    switch (type) {
      case "join": {
        const separator = config.join_str !== undefined ? config.join_str : "";
        const shouldStringify =
          config.stringify_output !== undefined
            ? config.stringify_output
            : true;

        if (currentValue !== undefined) {
          const currentStr =
            typeof currentValue === "object" && shouldStringify
              ? JSON.stringify(currentValue)
              : String(currentValue);
          const resolvedStr =
            typeof resolvedValue === "object" && shouldStringify
              ? JSON.stringify(resolvedValue)
              : String(resolvedValue);
          return currentStr + separator + resolvedStr;
        } else {
          return typeof resolvedValue === "object" && shouldStringify
            ? JSON.stringify(resolvedValue)
            : String(resolvedValue);
        }
      }

      case "update":
        return resolvedValue;

      case "append": {
        if (!Array.isArray(currentValue)) {
          throw new Error(`Cannot append to variable as it is not an array.`);
        }

        const shouldStringify =
          config.stringify_output !== undefined
            ? config.stringify_output
            : true;

        // For objects, optionally stringify them before appending
        const valueToAppend =
          typeof resolvedValue === "object" && shouldStringify
            ? JSON.stringify(resolvedValue)
            : resolvedValue;

        if (currentValue !== undefined) {
          return [...currentValue, valueToAppend];
        } else {
          return [valueToAppend];
        }
      }

      case "extract": {
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Extract operation requires an array input");
        }
        if (!config.field_path) {
          throw new Error("Extract operation requires field_path in config");
        }

        const shouldStringify =
          config.stringify_output !== undefined
            ? config.stringify_output
            : false;

        return resolvedValue
          .map((item: any) => {
            const extracted = this.getNestedValue(item, config.field_path);
            return extracted !== undefined &&
              typeof extracted === "object" &&
              shouldStringify
              ? JSON.stringify(extracted)
              : extracted;
          })
          .filter((value) => value !== undefined);
      }

      case "pick": {
        if (!config.fields || !Array.isArray(config.fields)) {
          throw new Error("Pick operation requires fields array in config");
        }

        const shouldStringify =
          config.stringify_output !== undefined
            ? config.stringify_output
            : false;

        if (Array.isArray(resolvedValue)) {
          const result = resolvedValue.map((item: any) => {
            const picked: any = {};
            for (const field of config.fields) {
              if (item && typeof item === "object") {
                // Handle nested field paths (e.g., "metadata.text")
                if (field.includes(".")) {
                  const value = this.getNestedValue(item, field);
                  if (value !== undefined) {
                    // Use the last part of the path as the key (e.g., "text" from "metadata.text")
                    const key = field.split(".").pop() || field;
                    picked[key] = value;
                  }
                } else {
                  // Handle simple field names
                  if (field in item) {
                    picked[field] = item[field];
                  }
                }
              }
            }
            return shouldStringify ? JSON.stringify(picked) : picked;
          });
          return result;
        } else if (resolvedValue && typeof resolvedValue === "object") {
          const picked: any = {};
          for (const field of config.fields) {
            // Handle nested field paths
            if (field.includes(".")) {
              const value = this.getNestedValue(resolvedValue, field);
              if (value !== undefined) {
                const key = field.split(".").pop() || field;
                picked[key] = value;
              }
            } else {
              // Handle simple field names
              if (field in resolvedValue) {
                picked[field] = resolvedValue[field];
              }
            }
          }
          return shouldStringify ? JSON.stringify(picked) : picked;
        }

        throw new Error(
          "Pick operation requires an object or array of objects",
        );
      }

      case "omit": {
        if (!config.fields || !Array.isArray(config.fields)) {
          throw new Error("Omit operation requires fields array in config");
        }

        const shouldStringify =
          config.stringify_output !== undefined
            ? config.stringify_output
            : false;

        if (Array.isArray(resolvedValue)) {
          return resolvedValue.map((item: any) => {
            if (!item || typeof item !== "object") return item;
            const omitted: any = { ...item };
            for (const field of config.fields) {
              // Handle nested field paths for omit
              if (field.includes(".")) {
                this.deleteNestedValue(omitted, field);
              } else {
                delete omitted[field];
              }
            }
            return shouldStringify ? JSON.stringify(omitted) : omitted;
          });
        } else if (resolvedValue && typeof resolvedValue === "object") {
          const omitted: any = { ...resolvedValue };
          for (const field of config.fields) {
            // Handle nested field paths for omit
            if (field.includes(".")) {
              this.deleteNestedValue(omitted, field);
            } else {
              delete omitted[field];
            }
          }
          return shouldStringify ? JSON.stringify(omitted) : omitted;
        }

        throw new Error(
          "Omit operation requires an object or array of objects",
        );
      }

      case "map": {
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Map operation requires an array input");
        }
        if (!config.mapping) {
          throw new Error("Map operation requires mapping configuration");
        }

        return resolvedValue.map((item: any) => {
          const mapped: any = {};
          for (const [targetField, sourcePath] of Object.entries(
            config.mapping,
          )) {
            if (typeof sourcePath === "string") {
              mapped[targetField] = this.getNestedValue(item, sourcePath);
            } else {
              mapped[targetField] = sourcePath;
            }
          }
          return mapped;
        });
      }

      case "filter": {
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Filter operation requires an array input");
        }
        if (!config.condition) {
          throw new Error("Filter operation requires condition configuration");
        }

        return resolvedValue.filter((item: any) => {
          const fieldValue = this.getNestedValue(item, config.condition.field);
          return this.evaluateCondition(
            fieldValue,
            config.condition.operator,
            config.condition.value,
          );
        });
      }

      case "slice": {
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Slice operation requires an array input");
        }

        const start = config.slice_start || 0;
        const end = config.slice_end;
        return resolvedValue.slice(start, end);
      }

      case "flatten": {
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Flatten operation requires an array input");
        }

        return resolvedValue.flat();
      }

      case "concat": {
        if (!Array.isArray(currentValue)) {
          throw new Error(
            "Concat operation requires current variable to be an array",
          );
        }
        if (!Array.isArray(resolvedValue)) {
          throw new Error("Concat operation requires input to be an array");
        }

        return [...currentValue, ...resolvedValue];
      }

      default:
        throw new Error(`Unknown update operation type: ${type}`);
    }
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Delete nested value from object using dot notation path
   */
  private deleteNestedValue(obj: any, path: string): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    const keys = path.split(".");
    let current = obj;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (current && typeof current === "object" && keys[i] in current) {
        current = current[keys[i]];
      } else {
        return; // Path doesn't exist
      }
    }

    // Delete the final key
    if (current && typeof current === "object") {
      delete current[keys[keys.length - 1]];
    }
  }

  /**
   * Evaluate condition for filter operations
   */
  private evaluateCondition(
    fieldValue: any,
    operator: string,
    compareValue: any,
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === compareValue;
      case "not_equals":
        return fieldValue !== compareValue;
      case "contains":
        if (
          typeof fieldValue === "string" &&
          typeof compareValue === "string"
        ) {
          return fieldValue.includes(compareValue);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(compareValue);
        }
        return false;
      case "greater_than":
        return (
          typeof fieldValue === "number" &&
          typeof compareValue === "number" &&
          fieldValue > compareValue
        );
      case "less_than":
        return (
          typeof fieldValue === "number" &&
          typeof compareValue === "number" &&
          fieldValue < compareValue
        );
      default:
        throw new Error(`Unknown condition operator: ${operator}`);
    }
  }
}
