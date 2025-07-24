/*
 * FlowValidator
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  FlowDefinition,
  FlowNode,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  DependencyGraph,
  VariableReference,
} from "../types";

import { Logger } from "../utils/Logger";

export class FlowValidator {
  private static logger: Logger = new Logger();

  /**
   * Complete flow validation - single entry point
   */
  static validateFlow(
    jsonData: any,
    availableProviders?: Set<string>,
  ): ValidationResult & {
    flow?: FlowDefinition;
    dependencyGraph?: DependencyGraph;
    complexity?: any;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Step 1: Parse and validate basic JSON structure
      const parseResult = this.parseAndValidateStructure(jsonData);
      errors.push(...parseResult.errors);
      warnings.push(...parseResult.warnings);

      if (!parseResult.isValid || !parseResult.flow) {
        return { isValid: false, errors, warnings };
      }

      const flow = parseResult.flow;

      // Step 2: Validate dependencies and variable references
      const dependencyResult = this.validateDependenciesAndVariables(flow);
      errors.push(...dependencyResult.errors);
      warnings.push(...dependencyResult.warnings);

      // Step 3: Validate providers if available
      if (availableProviders) {
        const providerResult = this.validateProviders(flow, availableProviders);
        errors.push(...providerResult.errors);
        warnings.push(...providerResult.warnings);
      }

      // Step 4: Semantic validations and optimizations
      const semanticResult = this.validateSemantics(flow);
      errors.push(...semanticResult.errors);
      warnings.push(...semanticResult.warnings);

      // Step 5: Complexity analysis
      const complexity = this.analyzeComplexity(flow);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        flow: errors.length === 0 ? flow : undefined,
        dependencyGraph: dependencyResult.graph,
        complexity,
      };
    } catch (error) {
      errors.push({
        path: "root",
        message: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: ValidationErrorCode.INVALID_FORMAT,
      });

      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Step 1: Parse JSON and validate basic structure
   */
  private static parseAndValidateStructure(
    jsonData: any,
  ): ValidationResult & { flow?: FlowDefinition } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if data is an object
    if (!jsonData || typeof jsonData !== "object") {
      errors.push({
        path: "root",
        message: "Flow definition must be an object",
        code: ValidationErrorCode.INVALID_TYPE,
      });
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ["name", "version", "description", "author"];
    for (const field of requiredFields) {
      if (!jsonData[field] || typeof jsonData[field] !== "string") {
        errors.push({
          path: field,
          message: `Field '${field}' is required and must be a string`,
          code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
        });
      }
    }

    // Validate semantic versioning format for version field
    if (jsonData.version && typeof jsonData.version === "string") {
      const semverValidation = this.validateSemanticVersioning(
        jsonData.version,
      );
      if (!semverValidation.isValid) {
        errors.push({
          path: "version",
          message:
            semverValidation.message ||
            "Invalid semantic versioning format. Expected format: MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.2.3-alpha, 2.1.0-beta.1)",
          code: ValidationErrorCode.INVALID_FORMAT,
        });
      }
    }

    // Optional array fields
    const arrayFields = ["variables", "input", "output", "nodes"];
    for (const field of arrayFields) {
      if (jsonData[field] && !Array.isArray(jsonData[field])) {
        errors.push({
          path: field,
          message: `Field '${field}' must be an array`,
          code: ValidationErrorCode.INVALID_TYPE,
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Create flow object
    const flow: FlowDefinition = {
      name: jsonData.name,
      version: jsonData.version,
      description: jsonData.description,
      author: jsonData.author,
      variables: jsonData.variables || [],
      input: jsonData.input || [],
      output: jsonData.output || [],
      nodes: jsonData.nodes || [],
    };

    // Validate nodes structure
    const nodeValidation = this.validateNodesStructure(flow.nodes);
    errors.push(...nodeValidation.errors);
    warnings.push(...nodeValidation.warnings);

    // Validate variables
    const variableValidation = this.validateVariablesStructure(flow.variables);
    errors.push(...variableValidation.errors);
    warnings.push(...variableValidation.warnings);

    // Validate input/output variable references
    const ioValidation = this.validateInputOutputReferences(flow);
    errors.push(...ioValidation.errors);
    warnings.push(...ioValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      flow: errors.length === 0 ? flow : undefined,
    };
  }

  /**
   * Step 2: Validate dependencies, execution order, and variable references
   */
  private static validateDependenciesAndVariables(
    flow: FlowDefinition,
  ): ValidationResult & { graph?: DependencyGraph } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Extract variable references
    const variableReferences = this.extractVariableReferences(flow);

    // Validate variable references
    const variableValidation = this.validateVariableReferences(
      flow,
      variableReferences,
    );
    errors.push(...variableValidation.errors);
    warnings.push(...variableValidation.warnings);

    // Build dependency graph
    const dependencyResult = this.buildDependencyGraph(
      flow,
      variableReferences,
    );
    errors.push(...dependencyResult.errors);
    warnings.push(...dependencyResult.warnings);

    if (dependencyResult.graph) {
      // Validate execution order
      const executionValidation = this.validateExecutionOrder(
        flow,
        dependencyResult.graph,
      );
      errors.push(...executionValidation.errors);
      warnings.push(...executionValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      graph: dependencyResult.graph,
    };
  }

  /**
   * Validate nodes structure (from original FlowParser)
   */
  private static validateNodesStructure(nodes: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const nodeIds = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodePath = `nodes[${i}]`;

      if (!node || typeof node !== "object") {
        errors.push({
          path: nodePath,
          message: "Node must be an object",
          code: ValidationErrorCode.INVALID_TYPE,
        });
        continue;
      }

      // Validate basic required fields
      if (!node.id || typeof node.id !== "string") {
        errors.push({
          path: `${nodePath}.id`,
          message: "Node id is required and must be a string",
          code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
        });
      } else {
        if (nodeIds.has(node.id)) {
          errors.push({
            path: `${nodePath}.id`,
            message: `Duplicate node id: ${node.id}`,
            code: ValidationErrorCode.DUPLICATE_NODE_ID,
          });
        } else {
          nodeIds.add(node.id);
        }
      }

      // Validate node type
      const validTypes = [
        "LLM",
        "DOCUMENT_SPLITTER",
        "TEXT_EMBEDDING",
        "VECTOR_INSERT",
        "VECTOR_SEARCH",
        "VECTOR_UPDATE",
        "VECTOR_DELETE",
        "FOR_EACH",
        "UPDATE_VARIABLE",
        "CONDITION",
      ];

      if (!node.type || !validTypes.includes(node.type)) {
        errors.push({
          path: `${nodePath}.type`,
          message: `Invalid node type: ${node.type}. Valid types: ${validTypes.join(", ")}`,
          code: ValidationErrorCode.INVALID_NODE_TYPE,
        });
      }

      if (!node.name || typeof node.name !== "string") {
        errors.push({
          path: `${nodePath}.name`,
          message: "Node name is required and must be a string",
          code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
        });
      }

      // Validate node-specific structure
      const nodeSpecificValidation = this.validateNodeSpecificStructure(
        node,
        nodePath,
      );
      errors.push(...nodeSpecificValidation.errors);
      warnings.push(...nodeSpecificValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate node-specific structure based on type
   */
  private static validateNodeSpecificStructure(
    node: any,
    nodePath: string,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    switch (node.type) {
      case "LLM":
        // Validate config
        if (!node.config?.provider || !node.config?.model) {
          errors.push({
            path: `${nodePath}.config`,
            message: "LLM node requires provider and model in config",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }

        // Validate messages
        if (!Array.isArray(node.messages) || node.messages.length === 0) {
          errors.push({
            path: `${nodePath}.messages`,
            message: "LLM node requires non-empty messages array",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }

        // Validate output schema
        if (!node.output || typeof node.output !== "object") {
          errors.push({
            path: `${nodePath}.output`,
            message: "LLM node requires output schema",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "DOCUMENT_SPLITTER":
        if (!node.config || !node.document) {
          errors.push({
            path: `${nodePath}`,
            message: "Document splitter requires config and document path",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "TEXT_EMBEDDING":
        if (!node.config?.provider || !node.input) {
          errors.push({
            path: `${nodePath}`,
            message: "Text embedding requires provider config and input",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "VECTOR_INSERT":
      case "VECTOR_SEARCH":
      case "VECTOR_UPDATE":
      case "VECTOR_DELETE":
        if (!node.config?.provider || !node.config?.index_name || !node.input) {
          errors.push({
            path: `${nodePath}`,
            message: "Vector node requires provider, index_name, and input",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "FOR_EACH":
        if (
          !node.config?.each_key ||
          !node.input?.items ||
          !Array.isArray(node.each_nodes)
        ) {
          errors.push({
            path: `${nodePath}`,
            message: "FOR_EACH requires each_key, items, and each_nodes array",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "UPDATE_VARIABLE":
        if (!node.config?.variable_id || !node.value) {
          errors.push({
            path: `${nodePath}`,
            message: "UPDATE_VARIABLE requires variable_id and value",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;

      case "CONDITION":
        if (!node.input?.switch_value || !node.branches) {
          errors.push({
            path: `${nodePath}`,
            message: "CONDITION requires switch_value and branches",
            code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
          });
        }
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate variables structure
   */
  private static validateVariablesStructure(
    variables: any[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const variableIds = new Set<string>();
    const validTypes = [
      "string",
      "number",
      "boolean",
      "file",
      "array",
      "object",
    ];

    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      const variablePath = `variables[${i}]`;

      if (!variable?.id || typeof variable.id !== "string") {
        errors.push({
          path: `${variablePath}.id`,
          message: "Variable id is required and must be a string",
          code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
        });
      } else if (variableIds.has(variable.id)) {
        errors.push({
          path: `${variablePath}.id`,
          message: `Duplicate variable id: ${variable.id}`,
          code: ValidationErrorCode.DUPLICATE_VARIABLE_ID,
        });
      } else {
        variableIds.add(variable.id);
      }

      // Validate variable type if specified
      if (variable.type !== undefined) {
        if (
          typeof variable.type !== "string" ||
          !validTypes.includes(variable.type)
        ) {
          errors.push({
            path: `${variablePath}.type`,
            message: `Invalid variable type: ${variable.type}. Valid types are: ${validTypes.join(", ")}`,
            code: ValidationErrorCode.INVALID_TYPE,
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate input/output variable references
   */
  private static validateInputOutputReferences(
    flow: FlowDefinition,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Get set of all variable IDs
    const variableIds = new Set(flow.variables.map((variable) => variable.id));

    // Validate input variable references
    for (let i = 0; i < flow.input.length; i++) {
      const inputVarId = flow.input[i];
      if (!variableIds.has(inputVarId)) {
        errors.push({
          path: `input[${i}]`,
          message: `Input variable '${inputVarId}' does not exist in variables array`,
          code: ValidationErrorCode.INVALID_VARIABLE_REFERENCE,
        });
      }
    }

    // Validate output variable references
    for (let i = 0; i < flow.output.length; i++) {
      const outputVarId = flow.output[i];
      if (!variableIds.has(outputVarId)) {
        errors.push({
          path: `output[${i}]`,
          message: `Output variable '${outputVarId}' does not exist in variables array`,
          code: ValidationErrorCode.INVALID_VARIABLE_REFERENCE,
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Extract variable references from flow with scope context
   */
  private static extractVariableReferences(
    flow: FlowDefinition,
  ): VariableReference[] {
    const references: VariableReference[] = [];

    const extractFromText = (
      text: string,
      scopeContext?: { forEachNodes?: Set<string>; scopeKeys?: Set<string> },
    ) => {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const variableExpression = match[1].trim();
        const parts = variableExpression.split(".");
        references.push({
          nodeId: parts[0],
          path: parts.slice(1).join("."),
          fullReference: match[0],
          scopeContext,
        });
      }
    };

    const extractFromNodes = (
      nodes: FlowNode[],
      scopeContext?: { forEachNodes?: Set<string>; scopeKeys?: Set<string> },
    ) => {
      for (const node of nodes) {
        if (node.type === "FOR_EACH") {
          // Create scope context for FOR_EACH nodes
          const forEachScopeNodes = new Set<string>();
          const scopeKeys = new Set<string>();

          // Add the each_key to scope keys
          if (node.config?.each_key) {
            scopeKeys.add(node.config.each_key);
            // Also add the index variable
            scopeKeys.add(node.config.each_key + "_index");
          }

          // Collect all node IDs in each_nodes for this scope
          const collectScopeNodes = (eachNodes: any[]) => {
            for (const eachNode of eachNodes) {
              forEachScopeNodes.add(eachNode.id);
              if (eachNode.type === "FOR_EACH" && eachNode.each_nodes) {
                collectScopeNodes(eachNode.each_nodes);
              }
            }
          };

          if (node.each_nodes) {
            collectScopeNodes(node.each_nodes);
          }

          const newScopeContext = {
            forEachNodes: forEachScopeNodes,
            scopeKeys: new Set([
              ...(scopeContext?.scopeKeys || []),
              ...scopeKeys,
            ]),
          };

          // Extract from the FOR_EACH node itself (input, config, etc.)
          const nodeWithoutEachNodes = { ...node };
          delete (nodeWithoutEachNodes as any).each_nodes;
          const nodeString = JSON.stringify(nodeWithoutEachNodes);
          extractFromText(nodeString, scopeContext);

          // Extract from each_nodes with scope context
          if (node.each_nodes) {
            extractFromNodes(node.each_nodes, newScopeContext);
          }
        } else {
          // Regular node processing
          const nodeString = JSON.stringify(node);
          extractFromText(nodeString, scopeContext);
        }
      }
    };

    extractFromNodes(flow.nodes);
    return references;
  }

  /**
   * Validate variable references with scope awareness
   */
  private static validateVariableReferences(
    flow: FlowDefinition,
    references: VariableReference[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const globalNodeIds = new Set(flow.nodes.map((node) => node.id));
    const variableIds = new Set(flow.variables.map((variable) => variable.id));

    for (const reference of references) {
      // Check if this is a scoped variable (like {{current}})
      if (reference.scopeContext?.scopeKeys?.has(reference.nodeId)) {
        continue; // Skip validation for scoped variables like {{current}} or {{current.property}}
      }

      // Check if this is a node reference (either with or without a path)
      let isValidNodeReference = false;

      // Check if it's a global node
      if (globalNodeIds.has(reference.nodeId)) {
        isValidNodeReference = true;
      }

      // Check if it's a scoped node within the same FOR_EACH
      if (reference.scopeContext?.forEachNodes?.has(reference.nodeId)) {
        isValidNodeReference = true;
      }

      if (isValidNodeReference) {
        // Valid node reference (with or without path)
        continue;
      }

      // If it's not a node reference, check if it's a variable reference
      // (this only applies when there's no path)
      if (!reference.path) {
        if (!variableIds.has(reference.nodeId)) {
          errors.push({
            path: "variable_reference",
            message: `Invalid variable reference: ${reference.fullReference}`,
            code: ValidationErrorCode.INVALID_VARIABLE_REFERENCE,
          });
        }
      } else {
        // Node reference with path but invalid node ID
        errors.push({
          path: "variable_reference",
          message: `Invalid node reference: ${reference.fullReference}`,
          code: ValidationErrorCode.INVALID_VARIABLE_REFERENCE,
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Build dependency graph
   */
  private static buildDependencyGraph(
    flow: FlowDefinition,
    references: VariableReference[],
  ): ValidationResult & { graph?: DependencyGraph } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const graph: DependencyGraph = {
      nodes: new Map(),
      executionOrder: [],
    };

    // Initialize graph - each node starts with no dependencies
    for (const node of flow.nodes) {
      graph.nodes.set(node.id, new Set());
    }

    // Build dependencies by analyzing which nodes use outputs from other nodes
    for (const node of flow.nodes) {
      const dependencies = new Set<string>();

      // Extract references for this specific node
      const nodeReferences = this.extractNodeReferences(node);

      for (const reference of nodeReferences) {
        // If this is a node output reference (has a path like "output.property")
        if (reference.path && reference.path.startsWith("output")) {
          dependencies.add(reference.nodeId);
        }
      }

      graph.nodes.set(node.id, dependencies);
    }

    // Generate execution order using topological sort
    try {
      graph.executionOrder = this.topologicalSort(graph);
      this.logger.debug("Execution order determined:", graph.executionOrder);
    } catch (error) {
      errors.push({
        path: "dependency_graph",
        message: "Circular dependency detected",
        code: ValidationErrorCode.CIRCULAR_DEPENDENCY,
      });
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings, graph };
  }

  /**
   * Extract variable references from a specific node
   */
  private static extractNodeReferences(node: any): VariableReference[] {
    const references: VariableReference[] = [];

    const extractFromText = (text: string) => {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const variableExpression = match[1].trim();
        const parts = variableExpression.split(".");
        references.push({
          nodeId: parts[0],
          path: parts.slice(1).join("."),
          fullReference: match[0],
        });
      }
    };

    // Extract based on node type
    switch (node.type) {
      case "UPDATE_VARIABLE":
        if (node.value) {
          extractFromText(node.value);
        }
        break;
      case "LLM":
        // Check messages for variable references
        if (node.messages) {
          for (const message of node.messages) {
            if (message.text) extractFromText(message.text);
            if (message.image_url) extractFromText(message.image_url);
            if (message.image_path) extractFromText(message.image_path);
          }
        }
        break;
      // Add other node types as needed
    }

    return references;
  }

  /**
   * Topological sort for execution order
   */
  private static topologicalSort(graph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    // Calculate in-degrees: how many nodes depend on each node
    for (const [nodeId, dependencies] of graph.nodes.entries()) {
      for (const dependency of dependencies) {
        if (graph.nodes.has(dependency)) {
          const currentInDegree = inDegree.get(nodeId) || 0;
          inDegree.set(nodeId, currentInDegree + 1);
        }
      }
    }

    // Add nodes with no dependencies to queue (in-degree = 0)
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      result.push(currentNode);

      // For each node that depends on the current node, reduce its in-degree
      for (const [nodeId, dependencies] of graph.nodes.entries()) {
        if (dependencies.has(currentNode)) {
          const newInDegree = (inDegree.get(nodeId) || 0) - 1;
          inDegree.set(nodeId, newInDegree);
          if (newInDegree === 0) {
            queue.push(nodeId);
          }
        }
      }
    }

    if (result.length !== graph.nodes.size) {
      throw new Error("Circular dependency detected");
    }

    return result;
  }

  /**
   * Validate execution order
   */
  private static validateExecutionOrder(
    flow: FlowDefinition,
    graph: DependencyGraph,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic validation that all nodes are in execution order
    const orderSet = new Set(graph.executionOrder);
    const nodeSet = new Set(flow.nodes.map((n) => n.id));

    if (orderSet.size !== nodeSet.size) {
      errors.push({
        path: "execution_order",
        message: "Execution order doesn't match all nodes",
        code: ValidationErrorCode.MISSING_DEPENDENCY,
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate providers
   */
  private static validateProviders(
    flow: FlowDefinition,
    availableProviders: Set<string>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const node of flow.nodes) {
      let requiredProvider: string | undefined;

      switch (node.type) {
        case "LLM":
        case "TEXT_EMBEDDING":
          requiredProvider = (node as any).config?.provider;
          break;
        case "VECTOR_INSERT":
        case "VECTOR_SEARCH":
        case "VECTOR_UPDATE":
        case "VECTOR_DELETE":
          requiredProvider = (node as any).config?.provider;
          break;
      }

      if (requiredProvider && !availableProviders.has(requiredProvider)) {
        errors.push({
          path: `nodes.${node.id}`,
          message: `Required provider '${requiredProvider}' is not configured`,
          code: ValidationErrorCode.MISSING_PROVIDER_CONFIG,
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Semantic validations
   */
  private static validateSemantics(flow: FlowDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic semantic checks
    if (flow.nodes.length === 0) {
      warnings.push({
        path: "nodes",
        message: "Flow has no nodes",
        code: ValidationErrorCode.INVALID_VALUE,
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Complexity analysis
   */
  private static analyzeComplexity(flow: FlowDefinition): any {
    const metrics = {
      totalNodes: flow.nodes.length,
      variableCount: flow.variables.length,
      complexity:
        flow.nodes.length > 20
          ? "high"
          : flow.nodes.length > 10
            ? "medium"
            : "low",
    };

    const suggestions: string[] = [];
    if (metrics.totalNodes > 20) {
      suggestions.push("Consider breaking this flow into smaller sub-flows");
    }

    return { metrics, suggestions };
  }

  /**
   * Validate semantic versioning format
   */
  private static validateSemanticVersioning(version: string): {
    isValid: boolean;
    message?: string;
  } {
    // Semantic versioning regex pattern
    // Matches: MAJOR.MINOR.PATCH with optional pre-release and build metadata
    // Examples: 1.0.0, 1.2.3-alpha, 1.0.0-beta.1, 2.1.0-rc.1+build.123
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

    if (!semverRegex.test(version)) {
      return {
        isValid: false,
        message: `Invalid semantic versioning format: "${version}". Expected format: MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.2.3-alpha, 2.1.0-beta.1)`,
      };
    }

    return { isValid: true };
  }

  /**
   * Set the logger instance to be used by the validator
   */
  static setLogger(logger: Logger): void {
    FlowValidator.logger = logger;
  }
}
