import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockLLMProvider } from "../mocks/MockLLMProvider";
import { Message } from "../../core/types";

describe("LLMNode Tests", () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe("MockLLMProvider", () => {
    it("should generate completion without API keys", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "test" },
      ];

      const response = await provider.generateCompletion(messages);

      expect(response).toBeDefined();
      expect(response.content).toContain("test successful");
      expect(response.usage).toBeDefined();
      expect(response.usage.total_tokens).toBe(15);
    });

    it("should handle custom mock responses", async () => {
      provider.addMockResponse("custom", '{"custom": "response"}');

      const messages: Message[] = [
        { type: "text", role: "user", text: "This is a custom prompt" },
      ];

      const response = await provider.generateCompletion(messages);

      expect(response.content).toBe('{"custom": "response"}');
    });

    it("should return default response for unmatched prompts", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "unknown prompt" },
      ];

      const response = await provider.generateCompletion(messages);

      expect(response.content).toContain("Mock response");
    });

    it("should handle system messages", async () => {
      const messages: Message[] = [
        { type: "text", role: "system", text: "You are a helpful assistant" },
        { type: "text", role: "user", text: "hello" },
      ];

      const response = await provider.generateCompletion(messages);

      expect(response.content).toContain("Hello from mock provider");
    });

    it("should support multiple messages", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "First message" },
        { type: "text", role: "assistant", text: "First response" },
        { type: "text", role: "user", text: "analyze this" },
      ];

      const response = await provider.generateCompletion(messages);

      expect(response.content).toContain("analysis");
      expect(response.content).toContain("0.95");
    });
  });

  describe("Retry Policy", () => {
    it("should handle retry configuration", async () => {
      const config = {
        model: "test-model",
        retry: {
          max_attempts: 3,
          delay_ms: 100,
        },
      };

      const providerWithRetry = new MockLLMProvider(config);
      const messages: Message[] = [
        { type: "text", role: "user", text: "test" },
      ];

      // Should work normally (mocked provider doesn't fail)
      const response = await providerWithRetry.generateCompletion(messages);

      expect(response).toBeDefined();
      expect(response.content).toContain("test successful");
    });
  });
});
