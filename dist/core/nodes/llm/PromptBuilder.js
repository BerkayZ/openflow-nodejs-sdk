"use strict";
/*
 * PromptBuilder
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
const types_1 = require("../../types");
const OutputFormatter_1 = require("./OutputFormatter");
class PromptBuilder {
    static buildPromptWithOutputInstructions(basePrompt, outputSchema) {
        if (!outputSchema || Object.keys(outputSchema).length === 0) {
            return basePrompt;
        }
        let prompt = basePrompt;
        prompt += this.buildOutputInstructions(outputSchema);
        return prompt;
    }
    static buildOutputInstructions(outputSchema) {
        let instructions = "\n\n" + "=".repeat(80);
        instructions += "\n🚨 CRITICAL: STRICT JSON SCHEMA ENFORCEMENT";
        instructions += "\n" + "=".repeat(80);
        instructions +=
            "\nYou MUST follow the exact schema below. DO NOT add any extra fields or properties.";
        instructions +=
            "\nDO NOT be creative. ONLY use the exact structure and types specified.\n";
        // Build field requirements
        instructions += "\n📋 REQUIRED JSON STRUCTURE:\n";
        for (const [fieldName, fieldConfig] of Object.entries(outputSchema)) {
            instructions += `\n🔸 "${fieldName}": `;
            instructions += this.buildFieldInstructions(fieldConfig, 0);
        }
        // Show example structure
        instructions += "\n\n📄 EXACT EXAMPLE STRUCTURE:";
        instructions += `\n${JSON.stringify(OutputFormatter_1.OutputFormatter.generateExampleOutput(outputSchema), null, 2)}`;
        // Critical rules
        instructions += "\n\n🚨 CRITICAL RULES:";
        instructions += "\n1. DO NOT add fields not listed in the schema";
        instructions += "\n2. DO NOT be creative with property names";
        instructions += "\n3. DO NOT add extra properties beyond what is defined";
        instructions +=
            "\n4. FOLLOW the field descriptions as instructions for content generation";
        instructions += "\n5. ONLY use the exact structure shown above";
        instructions += "\n\n" + "=".repeat(80);
        instructions +=
            "\n🎯 RESPOND WITH ONLY THE JSON OBJECT - NO EXTRA TEXT OR FIELDS";
        instructions += "\n" + "=".repeat(80);
        return instructions;
    }
    static buildFieldInstructions(fieldConfig, indentLevel = 0) {
        const indent = "  ".repeat(indentLevel);
        let instructions = "";
        // Use description as the main instruction
        if (fieldConfig.description) {
            instructions = `${fieldConfig.description}\n${indent}   Type: ${fieldConfig.type}`;
        }
        else {
            instructions = `(${fieldConfig.type}) No description provided`;
        }
        switch (fieldConfig.type) {
            case types_1.DataType.STRING:
                instructions += `\n${indent}   📝 String value`;
                break;
            case types_1.DataType.NUMBER:
                instructions += `\n${indent}   🔢 Must be a valid number`;
                break;
            case types_1.DataType.BOOLEAN:
                instructions += `\n${indent}   ✅ Must be true or false`;
                break;
            case types_1.DataType.ARRAY:
                instructions += `\n${indent}   📦 Array of items`;
                instructions += this.buildArrayInstructions(fieldConfig, indentLevel);
                break;
            case types_1.DataType.OBJECT:
                instructions += `\n${indent}   🏗️  Object`;
                instructions += this.buildObjectInstructions(fieldConfig, indentLevel);
                break;
        }
        return instructions;
    }
    static buildArrayInstructions(fieldConfig, indentLevel) {
        const indent = "  ".repeat(indentLevel);
        let instructions = "";
        if (fieldConfig.items) {
            if (fieldConfig.items.type === types_1.DataType.OBJECT &&
                fieldConfig.items.structure) {
                instructions += `\n${indent}     Each array item MUST have EXACTLY these properties:`;
                for (const [propName, propConfig] of Object.entries(fieldConfig.items.structure)) {
                    instructions += `\n${indent}       • "${propName}": ${this.buildFieldInstructions(propConfig, indentLevel + 3)}`;
                }
            }
            else {
                instructions += `\n${indent}     Array items: ${this.buildFieldInstructions(fieldConfig.items, indentLevel + 2)}`;
            }
        }
        return instructions;
    }
    static buildObjectInstructions(fieldConfig, indentLevel) {
        const indent = "  ".repeat(indentLevel);
        let instructions = "";
        if (fieldConfig.structure) {
            instructions += `\n${indent}     MUST have EXACTLY these properties:`;
            for (const [propName, propConfig] of Object.entries(fieldConfig.structure)) {
                instructions += `\n${indent}       • "${propName}": ${this.buildFieldInstructions(propConfig, indentLevel + 3)}`;
            }
        }
        return instructions;
    }
}
exports.PromptBuilder = PromptBuilder;
