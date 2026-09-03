const { GoogleGenAI } = require('@google/genai');
const AiProvider = require('./aiProvider');

class GeminiProvider extends AiProvider {
  constructor() {
    super();
    // Use the official SDK, which picks up GEMINI_API_KEY automatically from env if not provided
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.chatModel = process.env.AI_CHAT_MODEL || 'gemini-3.6-flash';
    this.structuredModel = process.env.AI_STRUCTURED_MODEL || 'gemini-3.6-flash';
    this.embeddingModel = process.env.AI_EMBEDDING_MODEL || 'text-embedding-004';
  }

  /**
   * Helper to format generic messages into Gemini-compatible contents.
   */
  _formatContents(messages) {
    return messages.map((msg) => {
      let parts = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      if (msg.toolCalls) {
        parts = parts.concat(msg.toolCalls.map(call => ({
          functionCall: {
            name: call.name,
            args: call.args
          }
        })));
      }
      if (msg.toolResponses) {
        parts = parts.concat(msg.toolResponses.map(resp => ({
          functionResponse: {
            name: resp.name,
            response: { result: resp.response }
          }
        })));
      }

      return {
        role: msg.role === 'system' ? 'user' : msg.role, // Gemini system instructions usually go elsewhere
        parts
      };
    });
  }

  async generate({ messages, tools, systemInstruction, signal }) {
    const config = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && tools.length > 0) {
      // Assuming tools follow OpenAPI/Gemini schema formats
      config.tools = [{ functionDeclarations: tools }];
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.chatModel,
        contents: this._formatContents(messages),
        config
      }); // @todo pass abort signal if supported by SDK wrapper

      const toolCalls = response.functionCalls?.map(fc => ({
        name: fc.name,
        args: fc.args
      })) || [];

      return {
        text: response.text || '',
        toolCalls,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (error) {
      console.error('[GeminiProvider] Generate error:', error);
      if (error.status === 429) {
        throw new Error('عذرًا، المساعد الذكي غير متاح حالياً بسبب تجاوز حد الاستخدام (نفاد الرصيد).');
      }
      throw new Error('تعذر معالجة طلبك بواسطة المساعد الذكي. يرجى المحاولة لاحقاً.');
    }
  }

  async generateStructured({ messages, schema, systemInstruction, signal }) {
    const config = {
      responseMimeType: 'application/json',
      responseSchema: schema
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.structuredModel,
        contents: this._formatContents(messages),
        config
      });

      let parsedData = {};
      try {
        parsedData = JSON.parse(response.text);
      } catch (e) {
        console.error('[GeminiProvider] Failed to parse structured output:', e);
      }

      return {
        text: response.text || '',
        data: parsedData,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (error) {
      console.error('[GeminiProvider] Structured generate error:', error);
      if (error.status === 429) {
        throw new Error('عذرًا، المساعد الذكي غير متاح حالياً بسبب تجاوز حد الاستخدام (نفاد الرصيد).');
      }
      throw new Error('تعذر معالجة طلبك بواسطة المساعد الذكي. يرجى المحاولة لاحقاً.');
    }
  }

  async embed({ texts, taskType, signal }) {
    try {
      const results = [];
      for (const text of texts) {
        const response = await this.ai.models.embedContent({
          model: this.embeddingModel,
          contents: [{ parts: [{ text }] }],
          config: { taskType: taskType === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY' }
        });
        results.push(response.embeddings?.[0]?.values || []);
      }
      return results;
    } catch (error) {
      console.error('[GeminiProvider] Embed error:', error);
      throw new Error('AI provider embedding failed');
    }
  }
}

module.exports = new GeminiProvider();
