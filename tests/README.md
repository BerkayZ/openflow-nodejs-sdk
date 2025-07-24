# OpenFlow SDK Test Suite

This directory contains tests for the OpenFlow Node.js SDK based on the examples and PROTOCOL.md specification.

## Test Structure

### Unit Tests (`tests/unit/`)

- **flow-executor.test.ts** - Tests core flow execution functionality
- **flow-validator.test.ts** - Tests flow validation according to protocol specification
- **node-types.test.ts** - Tests individual node type implementations and configurations
- **variable-system.test.ts** - Tests variable interpolation, resolution, and scoping

### Integration Tests (`tests/integration/`)

- **llm-flows.test.ts** - Tests real LLM provider integration based on examples
- **mcp-flows.test.ts** - Tests Model Context Protocol integration
- **vector-flows.test.ts** - Tests embedding and vector database operations
- **document-processing.test.ts** - Tests PDF processing and image analysis

## Test Configuration

- **Jest** is used as the test framework
- Tests use the `.env.test` file for API key configuration
- Timeout is set to 5 minutes (300000ms) for comprehensive tests
- Coverage reports are generated in the `coverage/` directory
- Test reports are generated in the `test-reports/` directory

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npx jest tests/unit/

# Run only integration tests
npx jest tests/integration/

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx jest tests/unit/node-types.test.ts
```

## Environment Setup

Before running integration tests, ensure you have the required API keys in `.env.test`:

```bash
# LLM Providers
GROK_API_KEY=your_grok_api_key
OPENAI_API_KEY=your_openai_api_key

# Vector Database
PINECONE_API_KEY=your_pinecone_api_key

# Test Configuration
TEST_INDEX_NAME=openflow-test-index
TEST_NAMESPACE=test-namespace
TEST_TEMP_DIR=./test_temp

# MCP Test Servers
MCP_DEEPWIKI_URL=https://mcp.deepwiki.com/mcp
MCP_SEMGREP_URL=https://mcp.semgrep.ai/mcp
MCP_COINGECKO_URL=https://mcp.api.coingecko.com/mcp

# Test Data
TEST_SAMPLE_TEXT="This is a test document for embedding and search operations."
TEST_USER_INPUT="Hello, this is a test input for the AI system."
TEST_IMAGE_PATH=./examples/test_image.png
TEST_PDF_PATH=./examples/sample.pdf
```

## Test Coverage

The test suite covers:

### Protocol Compliance

- Flow definition schema validation
- Node type specifications
- Variable system implementation
- Error handling requirements
- Security considerations

### Core Functionality

- Flow execution lifecycle
- Node processing (LLM, CONDITION, FOR_EACH, etc.)
- Variable interpolation and resolution
- Provider integrations (Grok, OpenAI, Pinecone)

### Advanced Features

- Model Context Protocol (MCP) integration
- Document processing (PDF splitting, image analysis)
- Vector database operations (embedding, search, insert)
- Complex workflow patterns

### Error Scenarios

- Invalid configurations
- Network timeouts
- Authentication failures
- Missing dependencies
- Circular references

## Test Design Principles

1. **Protocol-Compliant**: All tests follow the OpenFlow Protocol specification
2. **Environment Isolation**: Each test has its own execution context
3. **Realistic Scenarios**: Integration tests use real API providers when keys are available
4. **Graceful Degradation**: Tests skip when required credentials are not available

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are set in `.env.test`
2. **Timeout Errors**: Some LLM operations may take longer; adjust timeouts if needed
3. **Network Issues**: Integration tests require internet connectivity
4. **Temporary Files**: Tests clean up temporary files automatically

### Debugging Tests

```bash
# Run with verbose output
npx jest --verbose

# Run with debug logging
DEBUG=openflow:* npm test

# Run single test with detailed output
npx jest tests/unit/node-types.test.ts --verbose --no-coverage
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate setup/teardown for resources
3. Use descriptive test names that explain the scenario
4. Include both positive and negative test cases
5. Update this README if adding new test categories
