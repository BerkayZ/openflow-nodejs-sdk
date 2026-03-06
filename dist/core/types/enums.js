"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationErrorCode = exports.NodeType = exports.DataType = void 0;
var DataType;
(function (DataType) {
    DataType["STRING"] = "string";
    DataType["NUMBER"] = "number";
    DataType["BOOLEAN"] = "boolean";
    DataType["ARRAY"] = "array";
    DataType["OBJECT"] = "object";
})(DataType || (exports.DataType = DataType = {}));
var NodeType;
(function (NodeType) {
    NodeType["LLM"] = "LLM";
    NodeType["DOCUMENT_SPLITTER"] = "DOCUMENT_SPLITTER";
    NodeType["TEXT_EMBEDDING"] = "TEXT_EMBEDDING";
    NodeType["VECTOR_INSERT"] = "VECTOR_INSERT";
    NodeType["VECTOR_SEARCH"] = "VECTOR_SEARCH";
    NodeType["VECTOR_UPDATE"] = "VECTOR_UPDATE";
    NodeType["VECTOR_DELETE"] = "VECTOR_DELETE";
    NodeType["FOR_EACH"] = "FOR_EACH";
    NodeType["UPDATE_VARIABLE"] = "UPDATE_VARIABLE";
    NodeType["CONDITION"] = "CONDITION";
    NodeType["CONVERSATION_MEMORY"] = "CONVERSATION_MEMORY";
})(NodeType || (exports.NodeType = NodeType = {}));
var ValidationErrorCode;
(function (ValidationErrorCode) {
    // Schema validation errors
    ValidationErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ValidationErrorCode["INVALID_TYPE"] = "INVALID_TYPE";
    ValidationErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
    ValidationErrorCode["INVALID_VALUE"] = "INVALID_VALUE";
    // Flow structure errors
    ValidationErrorCode["DUPLICATE_NODE_ID"] = "DUPLICATE_NODE_ID";
    ValidationErrorCode["DUPLICATE_VARIABLE_ID"] = "DUPLICATE_VARIABLE_ID";
    ValidationErrorCode["INVALID_NODE_TYPE"] = "INVALID_NODE_TYPE";
    // Dependency errors
    ValidationErrorCode["CIRCULAR_DEPENDENCY"] = "CIRCULAR_DEPENDENCY";
    ValidationErrorCode["MISSING_DEPENDENCY"] = "MISSING_DEPENDENCY";
    ValidationErrorCode["INVALID_VARIABLE_REFERENCE"] = "INVALID_VARIABLE_REFERENCE";
    ValidationErrorCode["FORWARD_REFERENCE"] = "FORWARD_REFERENCE";
    // Provider errors
    ValidationErrorCode["UNKNOWN_PROVIDER"] = "UNKNOWN_PROVIDER";
    ValidationErrorCode["MISSING_PROVIDER_CONFIG"] = "MISSING_PROVIDER_CONFIG";
    // Output schema errors
    ValidationErrorCode["INVALID_OUTPUT_SCHEMA"] = "INVALID_OUTPUT_SCHEMA";
    ValidationErrorCode["MISSING_OUTPUT_PROPERTY"] = "MISSING_OUTPUT_PROPERTY";
})(ValidationErrorCode || (exports.ValidationErrorCode = ValidationErrorCode = {}));
