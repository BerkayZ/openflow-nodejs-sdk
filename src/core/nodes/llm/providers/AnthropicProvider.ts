import { LLMProvider } from '../LLMProvider';
import {
    Message,
    LLMConfig,
    LLMResponse,
    StreamCallback,
    StreamToken,
    MessageRole
} from '../../../types';
import { HttpClient, HttpRequestOptions } from '../../../utils/HttpClient';
import { ValidationError } from '../../../utils/errors';

export class AnthropicProvider extends LLMProvider {
    static readonly MODELS = {
        'claude-sonnet-4-5': 'claude-3-5-sonnet-latest',
        'claude-opus': 'claude-3-opus-20240229',
        'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229': 'claude-3-opus-20240229',
        'claude-3-haiku-20240307': 'claude-3-haiku-20240307'
    } as const;

    private httpClient: HttpClient;
    private apiKey?: string;

    constructor(config?: LLMConfig) {
        super(config);
        this.httpClient = new HttpClient('https://api.anthropic.com');
        this.apiKey = config?.api_key || process.env.ANTHROPIC_API_KEY;
    }

    private getHeaders(): Record<string, string> {
        if (!this.apiKey) {
            throw new ValidationError('Anthropic API key is required');
        }

        return {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        };
    }

    private mapModel(model: string): string {
        return AnthropicProvider.MODELS[model as keyof typeof AnthropicProvider.MODELS] || model;
    }

    private formatMessages(messages: Message[]): { system?: string; messages: any[] } {
        const formattedMessages: any[] = [];
        let systemPrompt: string | undefined;

        for (const message of messages) {
            if (message.role === 'system') {
                // Anthropic uses a separate system parameter
                systemPrompt = message.content;
            } else {
                formattedMessages.push({
                    role: message.role === 'user' ? 'user' : 'assistant',
                    content: message.content
                });
            }
        }

        return { system: systemPrompt, messages: formattedMessages };
    }

    async generateCompletion(
        messages: Message[],
        config?: LLMConfig
    ): Promise<LLMResponse> {
        const mergedConfig = this.mergeConfig(config);
        const { system, messages: formattedMessages } = this.formatMessages(messages);

        const requestBody: any = {
            model: this.mapModel(mergedConfig.model || 'claude-sonnet-4-5'),
            messages: formattedMessages,
            max_tokens: mergedConfig.max_tokens || 1024,
            temperature: mergedConfig.temperature || 0.7
        };

        if (system) {
            requestBody.system = system;
        }

        if (mergedConfig.top_p !== undefined) {
            requestBody.top_p = mergedConfig.top_p;
        }

        const options: HttpRequestOptions = {
            method: 'POST',
            headers: this.getHeaders(),
            body: requestBody
        };

        const response = await this.httpClient.request('/v1/messages', options);
        const data = await response.json();

        if (data.error) {
            throw new ValidationError(`Anthropic API error: ${data.error.message}`);
        }

        return {
            content: data.content[0].text,
            usage: {
                prompt_tokens: data.usage.input_tokens,
                completion_tokens: data.usage.output_tokens,
                total_tokens: data.usage.input_tokens + data.usage.output_tokens
            },
            model: data.model,
            finish_reason: data.stop_reason
        };
    }

    async generateCompletionStream(
        messages: Message[],
        config?: LLMConfig,
        onStream?: StreamCallback
    ): Promise<LLMResponse> {
        const mergedConfig = this.mergeConfig(config);
        const { system, messages: formattedMessages } = this.formatMessages(messages);

        const requestBody: any = {
            model: this.mapModel(mergedConfig.model || 'claude-sonnet-4-5'),
            messages: formattedMessages,
            max_tokens: mergedConfig.max_tokens || 1024,
            temperature: mergedConfig.temperature || 0.7,
            stream: true
        };

        if (system) {
            requestBody.system = system;
        }

        if (mergedConfig.top_p !== undefined) {
            requestBody.top_p = mergedConfig.top_p;
        }

        const options: HttpRequestOptions = {
            method: 'POST',
            headers: this.getHeaders(),
            body: requestBody
        };

        return new Promise((resolve, reject) => {
            let fullContent = '';
            let totalTokens = 0;
            let model = '';

            this.httpClient.requestSSE('/v1/messages', options, async (event) => {
                try {
                    if (event.event === 'message_start') {
                        const data = JSON.parse(event.data);
                        model = data.message.model;
                        totalTokens = data.message.usage?.input_tokens || 0;
                    } else if (event.event === 'content_block_delta') {
                        const data = JSON.parse(event.data);
                        const content = data.delta.text;

                        if (content) {
                            fullContent += content;

                            if (onStream) {
                                const token: StreamToken = {
                                    content,
                                    role: 'assistant' as MessageRole
                                };
                                await onStream(token);
                            }
                        }
                    } else if (event.event === 'message_delta') {
                        const data = JSON.parse(event.data);
                        if (data.usage) {
                            totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
                        }
                    } else if (event.event === 'message_stop') {
                        resolve({
                            content: fullContent,
                            usage: {
                                total_tokens: totalTokens,
                                prompt_tokens: 0,
                                completion_tokens: 0
                            },
                            model,
                            finish_reason: 'stop'
                        });
                    } else if (event.event === 'error') {
                        const errorData = JSON.parse(event.data);
                        reject(new ValidationError(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`));
                    }
                } catch (error) {
                    // Ignore parsing errors for unknown events
                    if (event.event === 'ping') {
                        // Keep-alive ping, ignore
                        return;
                    }
                }
            }).catch(reject);
        });
    }

    async isSupported(): Promise<boolean> {
        return !!this.apiKey;
    }
}