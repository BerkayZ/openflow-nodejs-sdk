# OpenFlow Node.js SDK

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Development Status](https://img.shields.io/badge/Status-Under%20Development-yellow.svg)](https://github.com/berkayz/openflow-nodejs-sdk)
![Stage: Pre-Alpha](https://img.shields.io/badge/Stage-Pre_Alpha-purple.svg)

> **⚠️ NOTICE: This package is currently under active development and is not fully complete. APIs may change without notice. Use at your own risk for production applications.**

The **OpenFlow Node.js SDK** is a TypeScript/JavaScript implementation of the OpenFlow Protocol — a standardized, extensible, and model-agnostic specification for orchestrating AI workflows using structured JSON definitions.

## 🚀 What is OpenFlow?

OpenFlow enables you to build complex AI workflows by chaining together different types of nodes:

- **LLM Nodes**: Generate text, analyze images, process documents
- **Vector Database Nodes**: Store and search embeddings (Pinecone support)
- **Document Processing**: Split PDFs into pages, extract text and images
- **Control Flow**: Conditional logic, loops, variable manipulation
- **Embedding Nodes**: Generate text embeddings (OpenAI support)
- **MCP Integration**: Model Context Protocol support for external tools and data sources

All orchestrated through declarative JSON flows that are portable, inspectable, and scalable.

## 📋 Current Status

### ✅ Implemented Features

- **Core Execution Engine**: Flow validation, execution, and variable resolution
- **LLM Integration**: Grok and OpenAI with text and vision support
- **Vector Database**: Pinecone integration (insert, search)
- **Document Processing**: PDF to image conversion and analysis
- **Text Embeddings**: OpenAI text-embedding models
- **Control Flow**: FOR_EACH loops, conditional branching, variable updates
- **Input Variables**: Runtime variable passing with type support
- **MCP Integration**: Model Context Protocol support with real-time tool access
- **Comprehensive Examples**: 12 working examples covering all features
- **Execution Hooks**: Pre/post execution hooks for custom logic

### 🚧 In Development

- **Additional LLM Providers**: AWS Bedrock, Anthropic, Gemini
- **More Vector Databases**: Weaviate, Qdrant, Chroma
- **Generative AI Nodes**: Image generation, audio processing, video generation
- **Plugin System**: Custom node types and providers
- **Performance Optimizations**: Caching, connection pooling

### 🔮 Planned Features

- **Stream Support**: Real-time data processing and streaming nodes
- **CLI Tools**: Flow execution and validation commands
- **Web Interface**: Visual flow builder and monitoring
- **Flow Marketplace**: Share and discover community flows
- **Plugin System**: Custom node types and providers
- **Cloud Deployment**: Hosted execution environment
- **Real-time Monitoring**: Flow execution dashboards
- **Local Models**: Support for running models locally (e.g., Llama 3, Mistral)

## 🛠️ Installation

```bash
will published in alpha version
```

## 🚀 Quick Start

```typescript
// Configure the executor
const executor = new FlowExecutor({
  concurrency: {
    global_limit: 3,
  },
  providers: {
    llm: {
      grok: {
        apiKey: "your_grok_api_key",
      },
    },
  },
  logLevel: "info",
});

// Define a simple flow
const flow = {
  name: "hello-world",
  version: "1.0.0",
  description: "A simple greeting flow",
  author: "Your Name",
  variables: [
    {
      id: "user_name",
      type: "string",
    },
  ],
  input: ["user_name"],
  output: ["greeting"],
  nodes: [
    {
      id: "greet",
      type: "LLM",
      name: "Generate Greeting",
      config: {
        provider: "grok",
        model: "grok-3-latest",
        max_tokens: 100,
      },
      messages: [
        {
          type: "text",
          role: "user",
          text: "Generate a friendly greeting for {{user_name}}",
        },
      ],
      output: {
        greeting: {
          type: "string",
          description: "A friendly greeting message",
        },
      },
    },
  ],
};

// Execute the flow
const result = await executor.executeFlow(flow, {
  user_name: "Alice",
});

console.log(result.outputs.greeting);
```

## 📚 Examples

The SDK includes examples in the `/examples` directory:

- **01-basic-llm.ts**: Basic LLM text generation
- **02-conditional-logic.ts**: Conditional branching based on user scores
- **03-for-each-loop.ts**: Array processing with FOR_EACH loops
- **04-image-analysis.ts**: Image analysis using vision models
- **05-pdf-processing.ts**: PDF document processing and analysis
- **06-embed-and-store.ts**: Generate embeddings and store in vector database
- **07-vector-search.ts**: Semantic search using vector similarity
- **08-hooks-example.ts**: Flow execution hooks and lifecycle management
- **09-mcp-deepwiki.ts**: MCP integration with DeepWiki knowledge search
- **10-mcp-semgrep.ts**: MCP integration with Semgrep security scanning
- **11-mcp-coingecko.ts**: MCP integration with CoinGecko cryptocurrency data

Run any example:

```bash
npm run example:01
```

## 🏗️ Architecture

### Core Components

- **FlowExecutor**: Main execution engine with concurrency control
- **Node Types**: Specialized processors for different AI tasks
- **Variable System**: Dynamic variable resolution and scoping
- **FileManager**: Secure file handling and temporary storage
- **Provider System**: Pluggable integrations for external services
- **Validation Engine**: Schema validation and dependency analysis

### Flow Structure

```json
{
  "name": "my-flow",
  "version": "1.0.0",
  "description": "Example flow",
  "author": "Your Name",
  "variables": [
    {
      "id": "input_text",
      "type": "string"
    }
  ],
  "input": ["input_text"],
  "output": ["result"],
  "nodes": [
    // Array of processing nodes
  ]
}
```

## 🔧 Configuration

### MCP Integration

The SDK supports Model Context Protocol (MCP) integration, allowing LLMs to access external tools and data sources in real-time even model is not supporting MCP natively. This enables advanced capabilities like knowledge search, security scanning, and more.:

```typescript
const flow = {
  nodes: [
    {
      id: "llm_with_mcp",
      type: "LLM",
      name: "LLM with MCP Tools",
      config: {
        provider: "grok",
        model: "grok-3-latest",
        // MCP server configurations
        mcp_servers: [
          {
            name: "deepwiki",
            url: "https://mcp.deepwiki.com/mcp",
            description: "DeepWiki knowledge search",
            auth: { type: "none" },
          },
          {
            name: "semgrep",
            url: "https://mcp.semgrep.ai/mcp",
            description: "Semgrep security scanning",
            auth: { type: "none" },
          },
        ],
        // MCP tools configuration
        tools: {
          auto_discover: true,
          mcp_servers: ["deepwiki", "semgrep"],
          builtin_tools: ["set_variable", "get_variable"],
        },
      },
      messages: [
        {
          type: "text",
          role: "system",
          text: "You have access to external tools. Use them to enhance your responses.",
        },
      ],
    },
  ],
};
```

### Provider Setup

```typescript
const config = {
  providers: {
    llm: {
      grok: {
        apiKey: "your_grok_api_key",
      },
    },
    vectorDB: {
      pinecone: {
        provider: "pinecone",
        index_name: "your-index",
        apiKey: "your_pinecone_api_key",
      },
    },
    embeddings: {
      openai: {
        apiKey: "your_openai_api_key",
      },
    },
  },
};
```

## 📖 Documentation

- **[Protocol Specification](https://protocol.openflowsdk.org)**: Complete OpenFlow protocol documentation
- **[Examples README](./examples/README.md)**: Detailed example documentation

## 🤝 Contributing

We welcome contributions! Since the project is under active development, please:

1. Check existing issues and discussions
2. Open an issue before starting major work
3. Follow the existing code style and patterns
4. **Run linting and formatting** before submitting:
   ```bash
   npm run lint    # Check and fix linting issues
   npm run format  # Format code with Prettier
   npm run validate # Run both linting and tests
   ```
5. **Minimize external dependencies** - avoid adding new libraries unless absolutely necessary. If you need to add a dependency, discuss it in an issue first
6. Include tests for new features, develop with test driven development (TDD)
7. Update documentation as needed

## Testing Requirements

**⚠️ API Keys Required for Testing**

Most tests require valid API keys to function properly.
\
Example env file is .env.test.example.
\
The test suite includes both unit and integration tests:

- **Unit Tests**: Test core logic without external API calls
- **Integration Tests**: Test actual provider integrations (require API keys)

### Required API Keys:

1. **Grok API Key** - For LLM integration tests
   - Get from: [console.x.ai](https://console.x.ai)
   - Required for: LLM node tests, MCP integration tests

2. **OpenAI API Key** - For embeddings and alternative LLM tests
   - Get from: [platform.openai.com](https://platform.openai.com)
   - Required for: Embedding tests, OpenAI LLM tests

3. **Pinecone API Key** - For vector database tests
   - Get from: [pinecone.io](https://pinecone.io)
   - Required for: Vector database integration tests
   - **Note**: You'll also need to create a test index in Pinecone

### Running Tests:

```bash
# Run all tests (requires API keys)
npm test

# Run only unit tests (no API keys needed)
npm run test:unit

# Run integration tests (requires API keys)
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/berkayz/openflow-nodejs-sdk.git
cd openflow-nodejs-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run linting and formatting
npm run lint
npm run format

# Run the validation suite (lint + tests)
npm run validate

# Run examples
npm run example:01
```

**Code Quality:**

- We use ESLint for linting and Prettier for formatting
- Run `npm run validate` before committing to ensure code quality
- All code should pass linting without warnings
- Follow TypeScript best practices

## 📝 License

This project is licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later). See the [LICENSE](./LICENSE) file for details.

---

**Built with ❤️ for AI community by [Berkay Zelyurt](https://github.com/berkayz)**
