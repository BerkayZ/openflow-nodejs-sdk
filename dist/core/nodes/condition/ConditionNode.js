"use strict";
/*
 * ConditionNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const NodeFactory_1 = require("../base/NodeFactory");
class ConditionNodeExecutor extends BaseNode_1.BaseNode {
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log(context, "debug", `Executing condition node: ${node.id}`);
            // Resolve the switch value using variable resolution
            const switchValue = this.resolveValueExpression(node.input.switch_value, context.registry);
            this.log(context, "debug", `Switch value resolved to: ${switchValue}`);
            // Find the matching branch
            const matchingBranch = this.findMatchingBranch(switchValue, node.branches);
            if (matchingBranch) {
                this.log(context, "debug", `Found matching branch: ${matchingBranch.branchName}`);
                // Execute nodes in the matching branch
                const results = [];
                for (const branchNode of matchingBranch.branch.nodes) {
                    const result = yield this.executeNode(branchNode, context);
                    results.push(result);
                }
                return {
                    matched_branch: matchingBranch.branchName,
                    results: results,
                };
            }
            else {
                this.log(context, "debug", "No matching branch found, no nodes executed");
                return {
                    matched_branch: null,
                    results: [],
                };
            }
        });
    }
    findMatchingBranch(switchValue, branches) {
        // Check each branch in order
        for (const [branchName, branch] of Object.entries(branches)) {
            // Handle default branch
            if (branchName === "default") {
                continue; // Process default at the end
            }
            // Check if this branch matches
            if (this.evaluateCondition(switchValue, branch.condition, branch.value)) {
                return { branchName, branch };
            }
        }
        // If no condition matched, check for default branch
        if (branches.default) {
            return { branchName: "default", branch: branches.default };
        }
        return null;
    }
    evaluateCondition(switchValue, condition, conditionValue) {
        switch (condition) {
            case "equals":
                return switchValue === conditionValue;
            case "not_equals":
                return switchValue !== conditionValue;
            case "greater_than":
                return Number(switchValue) > Number(conditionValue);
            case "less_than":
                return Number(switchValue) < Number(conditionValue);
            case "contains":
                if (typeof switchValue === "string" &&
                    typeof conditionValue === "string") {
                    return switchValue.includes(conditionValue);
                }
                if (Array.isArray(switchValue)) {
                    return switchValue.includes(conditionValue);
                }
                return false;
            case "not_contains":
                if (typeof switchValue === "string" &&
                    typeof conditionValue === "string") {
                    return !switchValue.includes(conditionValue);
                }
                if (Array.isArray(switchValue)) {
                    return !switchValue.includes(conditionValue);
                }
                return true;
            case "starts_with":
                if (typeof switchValue === "string" &&
                    typeof conditionValue === "string") {
                    return switchValue.startsWith(conditionValue);
                }
                return false;
            case "ends_with":
                if (typeof switchValue === "string" &&
                    typeof conditionValue === "string") {
                    return switchValue.endsWith(conditionValue);
                }
                return false;
            case "regex":
                if (typeof switchValue === "string" &&
                    typeof conditionValue === "string") {
                    try {
                        const regex = new RegExp(conditionValue);
                        return regex.test(switchValue);
                    }
                    catch (e) {
                        // Invalid regex pattern
                        return false;
                    }
                }
                return false;
            default:
                throw new Error(`Unknown condition operator: ${condition}`);
        }
    }
    executeNode(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodeExecutor = NodeFactory_1.NodeFactory.create(node.type);
            return yield nodeExecutor.executeWithContext(node, context);
        });
    }
}
exports.ConditionNodeExecutor = ConditionNodeExecutor;
