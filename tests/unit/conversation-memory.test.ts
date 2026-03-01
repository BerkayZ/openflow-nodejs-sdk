import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationMemoryNode } from '../../src/core/nodes/conversation-memory/ConversationMemoryNode';
import { Message } from '../../src/core/types';

describe('ConversationMemoryNode Tests', () => {
    let memoryNode: ConversationMemoryNode;

    beforeEach(() => {
        memoryNode = new ConversationMemoryNode();
    });

    describe('Session Management', () => {
        it('should create new session', () => {
            const sessionId = 'test-session-1';
            memoryNode.initializeSession(sessionId);

            const history = memoryNode.getHistory(sessionId);
            expect(history).toBeDefined();
            expect(history).toHaveLength(0);
        });

        it('should maintain separate sessions', () => {
            const session1 = 'session-1';
            const session2 = 'session-2';

            memoryNode.initializeSession(session1);
            memoryNode.initializeSession(session2);

            const message1: Message = { role: 'user', content: 'Message for session 1' };
            const message2: Message = { role: 'user', content: 'Message for session 2' };

            memoryNode.addMessage(session1, message1);
            memoryNode.addMessage(session2, message2);

            const history1 = memoryNode.getHistory(session1);
            const history2 = memoryNode.getHistory(session2);

            expect(history1).toHaveLength(1);
            expect(history2).toHaveLength(1);
            expect(history1[0].content).toBe('Message for session 1');
            expect(history2[0].content).toBe('Message for session 2');
        });

        it('should clear session history', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            memoryNode.addMessage(sessionId, { role: 'user', content: 'Test 1' });
            memoryNode.addMessage(sessionId, { role: 'assistant', content: 'Response 1' });

            expect(memoryNode.getHistory(sessionId)).toHaveLength(2);

            memoryNode.clearSession(sessionId);
            expect(memoryNode.getHistory(sessionId)).toHaveLength(0);
        });
    });

    describe('Message Management', () => {
        it('should add messages to session', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            const userMessage: Message = { role: 'user', content: 'Hello' };
            const assistantMessage: Message = { role: 'assistant', content: 'Hi there!' };

            memoryNode.addMessage(sessionId, userMessage);
            memoryNode.addMessage(sessionId, assistantMessage);

            const history = memoryNode.getHistory(sessionId);
            expect(history).toHaveLength(2);
            expect(history[0]).toEqual(userMessage);
            expect(history[1]).toEqual(assistantMessage);
        });

        it('should enforce max messages limit', () => {
            const sessionId = 'test-session';
            const maxMessages = 3;
            memoryNode.initializeSession(sessionId, { maxMessages });

            // Add more messages than the limit
            for (let i = 0; i < 5; i++) {
                memoryNode.addMessage(sessionId, {
                    role: 'user',
                    content: `Message ${i + 1}`
                });
            }

            const history = memoryNode.getHistory(sessionId);
            expect(history).toHaveLength(maxMessages);
            // Should keep the most recent messages
            expect(history[0].content).toBe('Message 3');
            expect(history[1].content).toBe('Message 4');
            expect(history[2].content).toBe('Message 5');
        });

        it('should handle system messages', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            const systemMessage: Message = {
                role: 'system',
                content: 'You are a helpful assistant'
            };
            const userMessage: Message = {
                role: 'user',
                content: 'What can you do?'
            };

            memoryNode.addMessage(sessionId, systemMessage);
            memoryNode.addMessage(sessionId, userMessage);

            const history = memoryNode.getHistory(sessionId);
            expect(history).toHaveLength(2);
            expect(history[0].role).toBe('system');
            expect(history[1].role).toBe('user');
        });
    });

    describe('Context Window Management', () => {
        it('should get recent context within window', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            // Add multiple messages
            for (let i = 0; i < 10; i++) {
                memoryNode.addMessage(sessionId, {
                    role: i % 2 === 0 ? 'user' : 'assistant',
                    content: `Message ${i + 1}`
                });
            }

            const recentContext = memoryNode.getRecentContext(sessionId, 5);
            expect(recentContext).toHaveLength(5);
            expect(recentContext[0].content).toBe('Message 6');
            expect(recentContext[4].content).toBe('Message 10');
        });

        it('should return all messages if window exceeds history', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            memoryNode.addMessage(sessionId, { role: 'user', content: 'Message 1' });
            memoryNode.addMessage(sessionId, { role: 'assistant', content: 'Message 2' });

            const recentContext = memoryNode.getRecentContext(sessionId, 10);
            expect(recentContext).toHaveLength(2);
        });
    });

    describe('Summary Generation', () => {
        it('should generate summary of conversation', () => {
            const sessionId = 'test-session';
            memoryNode.initializeSession(sessionId);

            memoryNode.addMessage(sessionId, {
                role: 'user',
                content: 'What is the weather like?'
            });
            memoryNode.addMessage(sessionId, {
                role: 'assistant',
                content: 'I cannot access real-time weather data.'
            });
            memoryNode.addMessage(sessionId, {
                role: 'user',
                content: 'Can you help with programming?'
            });
            memoryNode.addMessage(sessionId, {
                role: 'assistant',
                content: 'Yes, I can help with various programming tasks.'
            });

            const summary = memoryNode.generateSummary(sessionId);
            expect(summary).toBeDefined();
            expect(summary.totalMessages).toBe(4);
            expect(summary.userMessages).toBe(2);
            expect(summary.assistantMessages).toBe(2);
            expect(summary.topics).toContain('weather');
            expect(summary.topics).toContain('programming');
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent session gracefully', () => {
            const history = memoryNode.getHistory('non-existent');
            expect(history).toEqual([]);
        });

        it('should auto-initialize session when adding message', () => {
            const sessionId = 'auto-session';
            const message: Message = { role: 'user', content: 'Auto message' };

            memoryNode.addMessage(sessionId, message);
            const history = memoryNode.getHistory(sessionId);

            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(message);
        });
    });
});