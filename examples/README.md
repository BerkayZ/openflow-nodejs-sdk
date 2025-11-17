# OpenFlow SDK Examples

This directory contains examples demonstrating various features of the OpenFlow SDK.

## Examples

### 01-basic-llm.ts

Basic LLM interaction with text processing.

### 02-conditional-logic.ts

Conditional flow execution with branching logic based on user scores.

### 03-for-each-loop.ts

FOR_EACH node demonstration with array processing and scoped variables.

### 04-image-analysis.ts

Image analysis using vision-enabled LLM models.

### 05-pdf-processing.ts

PDF document processing with page-by-page analysis using FOR_EACH loops.

### 06-embed-and-store.ts

Generate text embeddings and store documents in vector database (Pinecone).

### 07-vector-search.ts

Search for similar documents in vector database using semantic similarity.

### 08-hooks-example.ts

Demonstrates flow execution hooks for monitoring and controlling flow execution lifecycle.

### 09-mcp-deepwiki.ts

MCP (Model Context Protocol) integration with DeepWiki server for knowledge search and retrieval.

### 10-mcp-semgrep.ts

MCP integration with Semgrep security scanner - generates code and performs security analysis.

### 11-mcp-coingecko.ts

MCP integration with CoinGecko API for real-time cryptocurrency price data and market analysis.

## Running Examples

```bash
# Run any example
npx ts-node examples/01-basic-llm.ts

# Or compile and run
npm run build
node examples/01-basic-llm.js
```

## Input Variables

All examples now demonstrate the new input variable functionality. Instead of setting default values in the flow definition, you can pass input variables when executing the flow:

```typescript
// Old way (still supported)
const flow = {
  variables: [{ id: "user_prompt", default: "Hello world" }],
};
await executor.executeFlow(flow);

// New way (recommended)
const flow = {
  variables: [{ id: "user_prompt" }],
};
await executor.executeFlow(flow, {
  user_prompt: "Hello world",
});
```

This approach provides better separation between flow logic and runtime data, making flows more reusable and testable.

## Variable Manipulation Operations

The SDK now supports comprehensive variable manipulation operations for professional array and object transformations:

### Basic Operations

- **`update`** - Replace variable value completely
- **`join`** - Concatenate values with optional separator
- **`append`** - Add value to array

### Array Operations

- **`extract`** - Extract specific fields from object arrays
  ```typescript
  // [{text: "hello", id: "1"}] → ["hello"]
  { type: "extract", field_path: "text" }
  ```

- **`map`** - Transform array elements with custom mapping
  ```typescript
  { type: "map", mapping: { "content": "text", "source": "id" } }
  ```

- **`filter`** - Filter array elements by conditions
  ```typescript
  { type: "filter", condition: { field: "score", operator: "greater_than", value: 0.8 } }
  ```

- **`slice`** - Get subset of array
  ```typescript
  { type: "slice", slice_start: 0, slice_end: 3 }
  ```

- **`flatten`** - Flatten nested arrays
- **`concat`** - Concatenate arrays together

### Object Operations

- **`pick`** - Select specific properties from objects
  ```typescript
  // [{text: "hello", id: "1"}] → [{text: "hello"}]
  { type: "pick", fields: ["text"] }
  ```

- **`omit`** - Remove specific properties from objects
  ```typescript
  { type: "omit", fields: ["id", "metadata"] }
  ```

### Advanced Features

- **Nested field access**: Use dot notation (`metadata.title`, `results[0].score`)
- **Condition operators**: `equals`, `not_equals`, `contains`, `greater_than`, `less_than`
- **Variable resolution**: All config fields support `{{variable}}` syntax
- **Type safety**: Comprehensive error handling for invalid operations
- **Output stringification control**: Use `stringify_output: false` to preserve objects as objects instead of converting to JSON strings
  ```typescript
  // Keep objects as objects (default for most operations)
  { type: "pick", fields: ["text"], stringify_output: false }

  // Convert output to JSON strings (default for join/append)
  { type: "append", stringify_output: true }
  ```

## Configuration

All examples require proper API keys configured in the FlowExecutorConfig:

- **LLM Provider**: Grok API key for text/vision models (examples 01, 04, 05, 08, 09, 10, 11)
- **Embeddings Provider**: OpenAI API key for text embeddings (examples 06, 07)
- **Vector Database**: Pinecone API key for vector operations (examples 06, 07)
- **MCP Servers**: External MCP servers for enhanced functionality (examples 09, 10, 11)

## Vector Database Workflow

Examples 06 and 07 demonstrate a complete vector database workflow:

1. **First run `06-embed-and-store.ts`** to embed documents and store them in Pinecone
2. **Then run `07-vector-search.ts`** to search for similar documents using semantic queries

This separation allows you to:

- Build your knowledge base once (embedding/storage)
- Perform multiple searches without re-embedding
- Test different search queries and similarity thresholds

## MCP Integration Workflow

Examples 09-12 demonstrate Model Context Protocol (MCP) integration:

1. **09-mcp-deepwiki.ts**: Knowledge search using DeepWiki MCP server
2. **10-mcp-semgrep.ts**: Two-stage workflow - code generation followed by security scanning
3. **11-mcp-coingecko.ts**: Real-time cryptocurrency price data and market analysis

MCP integration allows LLMs to access external tools and data sources in real-time, extending their capabilities beyond their training data.
