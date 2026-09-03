/**
 * Standardized AI Provider Contract.
 * Any AI provider (Gemini, OpenAI, etc.) must implement these methods.
 * 
 * @typedef {Object} Message
 * @property {'user'|'model'|'system'} role
 * @property {string} text
 * @property {Object} [toolCalls]
 * @property {Object} [toolResponses]
 * 
 * @typedef {Object} GenerateOptions
 * @property {Message[]} messages
 * @property {Object[]} [tools]
 * @property {string} [systemInstruction]
 * @property {AbortSignal} [signal]
 * 
 * @typedef {Object} GenerateStructuredOptions
 * @property {Message[]} messages
 * @property {Object} schema - The expected JSON schema
 * @property {string} [systemInstruction]
 * @property {AbortSignal} [signal]
 * 
 * @typedef {Object} EmbedOptions
 * @property {string[]} texts
 * @property {'retrieval'|'document'} taskType
 * @property {AbortSignal} [signal]
 * 
 * @typedef {Object} GenerateResponse
 * @property {string} text
 * @property {Object[]} [toolCalls]
 * @property {Object} usage
 * @property {number} usage.inputTokens
 * @property {number} usage.outputTokens
 */

class AiProvider {
  /**
   * Generate a response, potentially requesting tools.
   * @param {GenerateOptions} options
   * @returns {Promise<GenerateResponse>}
   */
  async generate(options) {
    throw new Error('Not implemented');
  }

  /**
   * Generate a structured JSON response matching a specific schema.
   * @param {GenerateStructuredOptions} options
   * @returns {Promise<GenerateResponse & { data: Object }>}
   */
  async generateStructured(options) {
    throw new Error('Not implemented');
  }

  /**
   * Stream a response (for future use).
   * @param {GenerateOptions} options
   * @returns {AsyncGenerator<string, void, unknown>}
   */
  async *stream(options) {
    throw new Error('Not implemented');
  }

  /**
   * Generate embeddings for an array of texts.
   * @param {EmbedOptions} options
   * @returns {Promise<number[][]>}
   */
  async embed(options) {
    throw new Error('Not implemented');
  }
}

module.exports = AiProvider;
