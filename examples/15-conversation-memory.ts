/**
 * OpenFlow Conversation Memory Example
 * Demonstrates stateful conversations using ConversationMemoryNode
 */

import { FlowExecutor } from "../src";
import {
  Flow,
  LLMNode,
  ConversationMemoryNode,
  NodeType,
} from "../src/core/types";

// Chat flow with conversation memory
const chatFlow: Flow = {
  id: "chat-with-memory",
  name: "Conversational AI with Memory",
  description: "Maintains context across multiple conversation turns",
  variables: {
    session_id: "user-123",
    max_history: 10,
  },
  nodes: [
    {
      id: "memory_manager",
      type: NodeType.CONVERSATION_MEMORY,
      config: {
        session_id: "{{session_id}}",
        max_messages: "{{max_history}}",
        include_system: true,
      },
      action: "get",
      input: {},
    } as ConversationMemoryNode,
    {
      id: "chat_response",
      type: NodeType.LLM,
      config: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        max_tokens: 300,
        temperature: 0.7,
      },
      messages: [
        {
          type: "text",
          role: "system",
          text: "You are a helpful AI assistant. Maintain context from previous conversations.",
        },
        // Previous conversation history injected here
        {
          type: "text",
          role: "user",
          text: "{{@memory_manager.history}}",
        },
        // Current user message
        {
          type: "text",
          role: "user",
          text: "{{user_message}}",
        },
      ],
      output: {
        response: {
          type: "string",
          description: "AI response",
        },
        sentiment: {
          type: "string",
          description: "Detected sentiment of the conversation",
        },
      },
    } as LLMNode,
    {
      id: "save_conversation",
      type: NodeType.CONVERSATION_MEMORY,
      config: {
        session_id: "{{session_id}}",
      },
      action: "add",
      input: {
        messages: [
          {
            role: "user",
            content: "{{user_message}}",
          },
          {
            role: "assistant",
            content: "{{@chat_response.response}}",
          },
        ],
      },
    } as ConversationMemoryNode,
  ],
};

// Customer support flow with memory and context
const supportFlow: Flow = {
  id: "customer-support",
  name: "Customer Support Bot with Memory",
  description: "Handles customer queries with conversation history",
  variables: {
    customer_id: "cust-456",
    department: "technical",
  },
  nodes: [
    {
      id: "load_context",
      type: NodeType.CONVERSATION_MEMORY,
      config: {
        session_id: "{{customer_id}}_{{department}}",
        max_messages: 20,
      },
      action: "get",
      input: {},
    } as ConversationMemoryNode,
    {
      id: "check_summary",
      type: NodeType.CONVERSATION_MEMORY,
      config: {
        session_id: "{{customer_id}}_{{department}}",
      },
      action: "summary",
      input: {},
    } as ConversationMemoryNode,
    {
      id: "support_response",
      type: NodeType.LLM,
      config: {
        provider: "anthropic",
        model: "claude-3-haiku-20240307",
        max_tokens: 400,
      },
      messages: [
        {
          type: "text",
          role: "system",
          text: `You are a ${"{{department}}"} support specialist.
                    Previous conversation summary: {{@check_summary.summary}}
                    Maintain continuity with past interactions.`,
        },
        {
          type: "text",
          role: "user",
          text: "{{customer_query}}",
        },
      ],
      output: {
        response: {
          type: "string",
          description: "Support response",
        },
        requires_escalation: {
          type: "boolean",
          description: "Whether to escalate to human agent",
        },
        issue_category: {
          type: "string",
          description: "Category of the issue",
        },
      },
    } as LLMNode,
    {
      id: "update_history",
      type: NodeType.CONVERSATION_MEMORY,
      config: {
        session_id: "{{customer_id}}_{{department}}",
      },
      action: "add",
      input: {
        messages: [
          {
            role: "user",
            content: "{{customer_query}}",
          },
          {
            role: "assistant",
            content: "{{@support_response.response}}",
          },
        ],
      },
    } as ConversationMemoryNode,
  ],
};

// Interactive chat session
async function runInteractiveChat() {
  const executor = new FlowExecutor({
    providers: {
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
        },
      },
    },
  });

  const sessionId = `session_${Date.now()}`;
  console.log("Interactive Chat Session Started");
  console.log(`Session ID: ${sessionId}`);
  console.log('Type "exit" to end the conversation\n');
  console.log("=".repeat(50));

  // Simulate multiple conversation turns
  const conversations = [
    "Hello! I'm interested in learning about machine learning.",
    "What are neural networks?",
    "Can you explain backpropagation?",
    "How does this relate to what we discussed about neural networks?",
    "Thank you for the explanations!",
  ];

  for (const message of conversations) {
    console.log(`\nUser: ${message}`);

    // Update variables for this turn
    chatFlow.variables.user_message = message;
    chatFlow.variables.session_id = sessionId;

    const result = await executor.executeFlow(chatFlow);

    if (result.success) {
      const response = result.outputs.chat_response?.response;
      console.log(`Assistant: ${response}`);

      // Show sentiment if detected
      const sentiment = result.outputs.chat_response?.sentiment;
      if (sentiment) {
        console.log(`[Sentiment: ${sentiment}]`);
      }
    } else {
      console.error("Error:", result.error);
    }

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("Conversation ended.");
}

// Multi-user conversation management
async function runMultiUserConversations() {
  const executor = new FlowExecutor({
    providers: {
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
        },
      },
    },
  });

  console.log("Multi-User Conversation Demo");
  console.log("=".repeat(50));

  // Simulate multiple users with different sessions
  const users = [
    { id: "alice", message: "I need help with Python programming" },
    { id: "bob", message: "Tell me about space exploration" },
    { id: "alice", message: "How do I use list comprehensions?" },
    { id: "charlie", message: "What's the weather like?" },
    { id: "bob", message: "What did we just discuss?" },
  ];

  for (const user of users) {
    console.log(`\n[${user.id}]: ${user.message}`);

    chatFlow.variables.user_message = user.message;
    chatFlow.variables.session_id = user.id;

    const result = await executor.executeFlow(chatFlow);

    if (result.success) {
      const response = result.outputs.chat_response?.response;
      console.log(`[Assistant to ${user.id}]: ${response}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// Customer support scenario with context awareness
async function runCustomerSupport() {
  const executor = new FlowExecutor({
    providers: {
      llm: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || "your-anthropic-key",
        },
      },
    },
  });

  console.log("\nCustomer Support Bot Demo");
  console.log("=".repeat(50));

  const supportQueries = [
    {
      customer: "cust-789",
      query: "My internet connection keeps dropping",
      department: "technical",
    },
    {
      customer: "cust-789",
      query: "I've tried restarting the router as you suggested earlier",
      department: "technical",
    },
    {
      customer: "cust-789",
      query: "The problem still persists. What else can I try?",
      department: "technical",
    },
    {
      customer: "cust-123",
      query: "I want to upgrade my plan",
      department: "billing",
    },
  ];

  for (const support of supportQueries) {
    console.log(`\n[Customer ${support.customer}]: ${support.query}`);

    supportFlow.variables.customer_id = support.customer;
    supportFlow.variables.customer_query = support.query;
    supportFlow.variables.department = support.department;

    const result = await executor.executeFlow(supportFlow);

    if (result.success) {
      const response = result.outputs.support_response?.response;
      const escalate = result.outputs.support_response?.requires_escalation;
      const category = result.outputs.support_response?.issue_category;

      console.log(`[Support]: ${response}`);

      if (escalate) {
        console.log(`⚠️  [System]: Escalating to human agent`);
      }

      if (category) {
        console.log(`📁 [Category]: ${category}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Memory management operations
async function demonstrateMemoryOperations() {
  const executor = new FlowExecutor({
    providers: {
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || "your-openai-key",
        },
      },
    },
  });

  console.log("\nMemory Management Operations");
  console.log("=".repeat(50));

  const sessionId = "demo-session";

  // Flow for memory operations
  const memoryOpsFlow: Flow = {
    id: "memory-ops",
    name: "Memory Operations",
    description: "Demonstrates memory management",
    variables: {
      session_id: sessionId,
    },
    nodes: [
      {
        id: "memory_op",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          session_id: "{{session_id}}",
        },
        action: "{{memory_action}}",
        input: "{{memory_input}}",
      } as ConversationMemoryNode,
    ],
  };

  // Add messages
  console.log("Adding messages to memory...");
  memoryOpsFlow.variables.memory_action = "add";
  memoryOpsFlow.variables.memory_input = {
    messages: [
      { role: "user", content: "First message" },
      { role: "assistant", content: "First response" },
      { role: "user", content: "Second message" },
      { role: "assistant", content: "Second response" },
    ],
  };
  await executor.executeFlow(memoryOpsFlow);

  // Get history
  console.log("\nRetrieving conversation history...");
  memoryOpsFlow.variables.memory_action = "get";
  memoryOpsFlow.variables.memory_input = {};
  const historyResult = await executor.executeFlow(memoryOpsFlow);
  console.log(
    "History:",
    JSON.stringify(historyResult.outputs.memory_op?.history, null, 2),
  );

  // Get summary
  console.log("\nGenerating conversation summary...");
  memoryOpsFlow.variables.memory_action = "summary";
  const summaryResult = await executor.executeFlow(memoryOpsFlow);
  console.log(
    "Summary:",
    JSON.stringify(summaryResult.outputs.memory_op?.summary, null, 2),
  );

  // Clear memory
  console.log("\nClearing conversation memory...");
  memoryOpsFlow.variables.memory_action = "clear";
  await executor.executeFlow(memoryOpsFlow);
  console.log("Memory cleared for session:", sessionId);
}

// Main execution
async function main() {
  console.log("OpenFlow Conversation Memory Examples");
  console.log("=====================================\n");

  // Run interactive chat example
  await runInteractiveChat();

  // Uncomment to run additional examples:
  // await runMultiUserConversations();
  // await runCustomerSupport();
  // await demonstrateMemoryOperations();
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { chatFlow, supportFlow };
