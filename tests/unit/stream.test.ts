import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockLLMProvider } from "../mocks/MockLLMProvider";
import { Message } from "../../core/types";

interface StreamToken {
  content: string;
  role: "assistant" | "user" | "system";
}

describe("Stream Tests", () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe("Stream Generation", () => {
    it("should stream tokens progressively", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "test" },
      ];

      const receivedTokens: StreamToken[] = [];

      await provider.generateCompletionStream(
        messages,
        undefined,
        async (token: StreamToken) => {
          receivedTokens.push(token);
        },
      );

      // Should have received multiple chunks
      expect(receivedTokens.length).toBeGreaterThan(1);

      // All tokens should have assistant role
      receivedTokens.forEach((token) => {
        expect(token.role).toBe("assistant");
      });

      // Concatenated content should match full response
      const fullContent = receivedTokens.map((t) => t.content).join("");
      expect(fullContent).toContain("test successful");
    });

    it("should work without stream callback", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "hello" },
      ];

      const response = await provider.generateCompletionStream(messages);

      expect(response).toBeDefined();
      expect(response.content).toContain("Hello from mock provider");
      expect(response.usage).toBeDefined();
    });

    it("should stream custom responses", async () => {
      provider.addMockResponse(
        "stream-test",
        '{"streaming": "works perfectly"}',
      );

      const messages: Message[] = [
        { type: "text", role: "user", text: "stream-test" },
      ];

      const chunks: string[] = [];

      await provider.generateCompletionStream(
        messages,
        undefined,
        async (token: StreamToken) => {
          chunks.push(token.content);
        },
      );

      const fullContent = chunks.join("");
      expect(fullContent).toBe('{"streaming": "works perfectly"}');
    });

    it("should handle empty messages", async () => {
      const messages: Message[] = [];

      const response = await provider.generateCompletionStream(messages);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it("should maintain token usage in streamed response", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "analyze" },
      ];

      const response = await provider.generateCompletionStream(
        messages,
        undefined,
        async () => {}, // Empty callback
      );

      expect(response.usage).toBeDefined();
      expect(response.usage.prompt_tokens).toBe(10);
      expect(response.usage.completion_tokens).toBe(5);
      expect(response.usage.total_tokens).toBe(15);
    });
  });

  describe("Stream Error Handling", () => {
    it("should handle stream interruption gracefully", async () => {
      const messages: Message[] = [
        { type: "text", role: "user", text: "test" },
      ];

      let tokenCount = 0;
      const maxTokens = 3;

      try {
        await provider.generateCompletionStream(
          messages,
          undefined,
          async (token: StreamToken) => {
            tokenCount++;
            if (tokenCount >= maxTokens) {
              throw new Error("Stream interrupted");
            }
          },
        );
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Stream interrupted");
      }

      expect(tokenCount).toBe(maxTokens);
    });
  });
});
