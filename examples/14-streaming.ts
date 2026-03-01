/**
 * OpenFlow Streaming Example
 * Demonstrates how to use executeFlowStream for real-time token streaming
 */

import { FlowExecutor, StreamToken } from '../src';
import { Flow, LLMNode, NodeType } from '../src/core/types';

// Example flow with streaming LLM
const streamingFlow: Flow = {
    id: 'streaming-example',
    name: 'Streaming Response Example',
    description: 'Demonstrates real-time streaming of LLM responses',
    variables: {
        topic: 'artificial intelligence',
        style: 'conversational and engaging'
    },
    nodes: [
        {
            id: 'generate_article',
            type: NodeType.LLM,
            config: {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                max_tokens: 500,
                temperature: 0.7
            },
            messages: [
                {
                    type: 'text',
                    role: 'system',
                    text: 'You are a creative writer. Write in a {{style}} style.'
                },
                {
                    type: 'text',
                    role: 'user',
                    text: 'Write a short article about {{topic}}. Make it informative and interesting.'
                }
            ],
            output: {
                article: {
                    type: 'string',
                    description: 'The generated article'
                },
                title: {
                    type: 'string',
                    description: 'A catchy title for the article'
                }
            }
        } as LLMNode
    ]
};

async function runStreamingExample() {
    // Initialize the flow executor with your API keys
    const executor = new FlowExecutor({
        providers: {
            llm: {
                openai: {
                    apiKey: process.env.OPENAI_API_KEY || 'your-openai-key'
                },
                anthropic: {
                    apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key'
                }
            }
        }
    });

    console.log('Starting streaming execution...\n');
    console.log('Topic:', streamingFlow.variables.topic);
    console.log('Style:', streamingFlow.variables.style);
    console.log('\n' + '='.repeat(50) + '\n');

    try {
        // Execute flow with streaming
        let fullContent = '';
        let tokenCount = 0;

        const result = await executor.executeFlowStream(
            streamingFlow,
            async (token: StreamToken) => {
                // Handle each streamed token
                if (token.content) {
                    // Print token to console in real-time
                    process.stdout.write(token.content);
                    fullContent += token.content;
                    tokenCount++;
                }

                // You can also track metadata
                if (token.role) {
                    // Token includes role information
                }
            }
        );

        console.log('\n\n' + '='.repeat(50));
        console.log('\nStreaming complete!');
        console.log(`Total tokens streamed: ${tokenCount}`);
        console.log('\nFinal structured output:');
        console.log(JSON.stringify(result.outputs.generate_article, null, 2));

    } catch (error) {
        console.error('Streaming failed:', error);
    }
}

// Advanced streaming example with multiple LLM nodes
const multiNodeStreamingFlow: Flow = {
    id: 'multi-streaming',
    name: 'Multi-Node Streaming Example',
    description: 'Demonstrates streaming with multiple LLM nodes',
    variables: {
        question: 'What are the benefits of renewable energy?'
    },
    nodes: [
        {
            id: 'initial_response',
            type: NodeType.LLM,
            config: {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                max_tokens: 200
            },
            messages: [
                {
                    type: 'text',
                    role: 'user',
                    text: '{{question}}'
                }
            ],
            output: {
                response: {
                    type: 'string',
                    description: 'Initial response'
                }
            }
        } as LLMNode,
        {
            id: 'elaborate',
            type: NodeType.LLM,
            config: {
                provider: 'anthropic',
                model: 'claude-3-haiku-20240307',
                max_tokens: 300
            },
            messages: [
                {
                    type: 'text',
                    role: 'system',
                    text: 'Elaborate on the following response with more details and examples.'
                },
                {
                    type: 'text',
                    role: 'user',
                    text: '{{@initial_response.response}}'
                }
            ],
            output: {
                elaboration: {
                    type: 'string',
                    description: 'Detailed elaboration'
                }
            }
        } as LLMNode
    ]
};

async function runMultiNodeStreaming() {
    const executor = new FlowExecutor({
        providers: {
            llm: {
                openai: {
                    apiKey: process.env.OPENAI_API_KEY || 'your-openai-key'
                },
                anthropic: {
                    apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key'
                }
            }
        }
    });

    console.log('\nMulti-Node Streaming Example');
    console.log('='.repeat(50));

    let currentNode = '';

    await executor.executeFlowStream(
        multiNodeStreamingFlow,
        async (token: StreamToken) => {
            // Track which node is streaming
            if (token.nodeId && token.nodeId !== currentNode) {
                currentNode = token.nodeId;
                console.log(`\n\n[Node: ${currentNode}]\n`);
            }

            if (token.content) {
                process.stdout.write(token.content);
            }
        }
    );

    console.log('\n\n' + '='.repeat(50));
    console.log('Multi-node streaming complete!');
}

// Streaming with error handling and progress tracking
async function runStreamingWithProgress() {
    const executor = new FlowExecutor({
        providers: {
            llm: {
                openai: {
                    apiKey: process.env.OPENAI_API_KEY || 'your-openai-key'
                }
            }
        }
    });

    const progressBar = createProgressBar(50);
    let progress = 0;
    const estimatedTokens = 500; // Estimate for progress calculation

    console.log('\nStreaming with Progress Tracking');
    console.log('='.repeat(50));

    try {
        await executor.executeFlowStream(
            streamingFlow,
            async (token: StreamToken) => {
                if (token.content) {
                    // Update progress
                    progress += token.content.length;
                    const percentage = Math.min((progress / estimatedTokens) * 100, 100);

                    // Clear line and show progress
                    process.stdout.write(`\r${progressBar(percentage)} ${Math.round(percentage)}%`);

                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
        );

        console.log('\n\nStreaming completed successfully!');

    } catch (error) {
        console.error('\nStreaming error:', error);

        // Implement retry logic
        console.log('Retrying with fallback provider...');

        // You could switch to a different provider or model here
        streamingFlow.nodes[0].config.provider = 'anthropic';
        streamingFlow.nodes[0].config.model = 'claude-3-haiku-20240307';

        // Retry the stream
        await runStreamingExample();
    }
}

// Helper function to create a progress bar
function createProgressBar(width: number) {
    return (percentage: number) => {
        const filled = Math.round((width * percentage) / 100);
        const empty = width - filled;
        return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
    };
}

// Main execution
async function main() {
    console.log('OpenFlow Streaming Examples');
    console.log('===========================\n');

    // Run basic streaming example
    await runStreamingExample();

    // Uncomment to run additional examples:
    // await runMultiNodeStreaming();
    // await runStreamingWithProgress();
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}

export { streamingFlow, multiNodeStreamingFlow };