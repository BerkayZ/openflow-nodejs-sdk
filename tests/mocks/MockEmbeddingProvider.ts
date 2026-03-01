/**
 * Mock Embedding Provider for testing purposes
 * Generates deterministic embeddings without requiring API keys
 */
export class MockEmbeddingProvider {
    private dimension: number;

    constructor(dimension: number = 768) {
        this.dimension = dimension;
    }

    /**
     * Generate mock embeddings for text
     * Returns deterministic embeddings based on text hash
     */
    async generateEmbedding(text: string): Promise<number[]> {
        // Simulate API delay
        await this.simulateDelay(50);

        // Generate deterministic embedding based on text
        const embedding = new Array(this.dimension);
        const hash = this.simpleHash(text);

        for (let i = 0; i < this.dimension; i++) {
            // Generate pseudo-random values based on hash and position
            embedding[i] = Math.sin(hash * (i + 1)) * 0.5 + 0.5;
        }

        return embedding;
    }

    /**
     * Generate embeddings for multiple texts
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings = [];
        for (const text of texts) {
            embeddings.push(await this.generateEmbedding(text));
        }
        return embeddings;
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Embeddings must have the same dimension');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Simple hash function for deterministic generation
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    private async simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}