import {
  BaseProvider,
  LLMMessage,
  LLMResponse,
  StreamChunk,
} from "../../core/nodes/llm/providers/BaseProvider";
import { ProviderConfig, OutputSchema, TextMessage } from "../../core/types";

/**
 * Mock LLM Provider for testing purposes
 * Provides deterministic responses without requiring API keys
 */
export class MockLLMProvider extends BaseProvider {
  private mockResponses: Map<string, string> = new Map();
  private defaultResponse = {
    content: '{"message": "Mock response", "data": "test"}',
    tokens: { prompt: 10, completion: 5, total: 15 },
  };

  constructor(config: ProviderConfig, apiKey: string = "mock-key") {
    super(config, apiKey);
    this.setupMockResponses();
  }

  private setupMockResponses() {
    // Setup some predefined responses for common prompts
    this.mockResponses.set("test", '{"result": "test successful"}');
    this.mockResponses.set(
      "hello",
      '{"greeting": "Hello from mock provider!"}',
    );
    this.mockResponses.set(
      "analyze",
      '{"analysis": "This is a mock analysis", "score": 0.95}',
    );
  }

  async generateCompletion(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): Promise<LLMResponse> {
    // Simulate API delay
    await this.simulateDelay(100);

    // Extract the last user message for matching
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    let content = "";
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === "string") {
        content = lastUserMessage.content;
      } else {
        // Extract text from multimodal content
        const textContent = lastUserMessage.content.find(
          (c) => c.type === "text",
        );
        content = textContent?.text || "";
      }
    }

    // Check for predefined responses
    let responseContent = this.defaultResponse.content;
    for (const [key, value] of this.mockResponses.entries()) {
      if (content.toLowerCase().includes(key)) {
        responseContent = value;
        break;
      }
    }

    return {
      content: responseContent,
      usage: {
        prompt_tokens: this.defaultResponse.tokens.prompt,
        completion_tokens: this.defaultResponse.tokens.completion,
        total_tokens: this.defaultResponse.tokens.total,
      },
    };
  }

  async *generateCompletionStream(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Get the response that would be generated
    const response = await this.generateCompletion(messages, outputSchema);

    // Simulate streaming by chunking the response
    const chunks = this.chunkString(response.content, 10);
    for (const chunk of chunks) {
      await this.simulateDelay(50);
      yield {
        content: chunk,
        isComplete: false,
      };
    }

    // Final chunk with usage data
    yield {
      content: "",
      isComplete: true,
      usage: response.usage,
    };
  }

  /**
   * Add a custom mock response for testing
   */
  addMockResponse(trigger: string, response: string) {
    this.mockResponses.set(trigger.toLowerCase(), response);
  }

  /**
   * Clear all mock responses except defaults
   */
  clearMockResponses() {
    this.mockResponses.clear();
    this.setupMockResponses();
  }

  /**
   * Set the default response for unmatched prompts
   */
  setDefaultResponse(
    content: string,
    tokens?: { prompt: number; completion: number; total: number },
  ) {
    this.defaultResponse = {
      content,
      tokens: tokens || this.defaultResponse.tokens,
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private chunkString(str: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
}
