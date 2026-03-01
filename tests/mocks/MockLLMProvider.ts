import { LLMProvider } from '../../src/core/nodes/llm/LLMProvider';
import { Message, LLMConfig, LLMResponse, StreamCallback, StreamToken } from '../../src/core/types';

/**
 * Mock LLM Provider for testing purposes
 * Provides deterministic responses without requiring API keys
 */
export class MockLLMProvider extends LLMProvider {
    private mockResponses: Map<string, string> = new Map();
    private defaultResponse = {
        content: '{"message": "Mock response", "data": "test"}',
        tokens: { prompt: 10, completion: 5, total: 15 }
    };

    constructor(config?: LLMConfig) {
        super(config);
        this.setupMockResponses();
    }

    private setupMockResponses() {
        // Setup some predefined responses for common prompts
        this.mockResponses.set('test', '{"result": "test successful"}');
        this.mockResponses.set('hello', '{"greeting": "Hello from mock provider!"}');
        this.mockResponses.set('analyze', '{"analysis": "This is a mock analysis", "score": 0.95}');
    }

    async generateCompletion(
        messages: Message[],
        config?: LLMConfig
    ): Promise<LLMResponse> {
        // Simulate API delay
        await this.simulateDelay(100);

        // Extract the last user message for matching
        const lastUserMessage = [...messages]
            .reverse()
            .find(m => m.role === 'user');

        const content = lastUserMessage?.content || '';

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
                total_tokens: this.defaultResponse.tokens.total
            },
            model: 'mock-model',
            finish_reason: 'stop'
        };
    }

    async generateCompletionStream(
        messages: Message[],
        config?: LLMConfig,
        onStream?: StreamCallback
    ): Promise<LLMResponse> {
        // Get the response that would be generated
        const response = await this.generateCompletion(messages, config);

        // Simulate streaming by chunking the response
        if (onStream) {
            const chunks = this.chunkString(response.content, 10);
            for (const chunk of chunks) {
                await this.simulateDelay(50);
                const token: StreamToken = {
                    content: chunk,
                    role: 'assistant'
                };
                await onStream(token);
            }
        }

        return response;
    }

    async isSupported(): Promise<boolean> {
        return true;
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
    setDefaultResponse(content: string, tokens?: { prompt: number; completion: number; total: number }) {
        this.defaultResponse = {
            content,
            tokens: tokens || this.defaultResponse.tokens
        };
    }

    private async simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private chunkString(str: string, size: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.slice(i, i + size));
        }
        return chunks;
    }
}