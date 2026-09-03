const geminiProvider = require('./providers/geminiProvider');
const { toolDeclarations, executeTool } = require('./tools/toolRegistry');
const { validateResponseBlocks } = require('./aiResponseValidator');
const crypto = require('crypto');

const SYSTEM_INSTRUCTION = `
You are the Home Business Marketplace AI Assistant.
Rules:
1. Marketplace/store/product data is true ONLY when included in a verified tool result.
2. Do not invent products, prices, or store details.
3. Label recommendations as "اقتراح من الذكاء الاصطناعي".
4. You cannot make transactions, promises, reservations, orders, or payments.
5. Answer in Arabic.

When the user asks a question, use tools to find the answer. Do not guess.
`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING', description: 'The text response to the user' },
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', description: '"product", "store", or "comparison"' },
          productId: { type: 'STRING' },
          storeId: { type: 'STRING' },
          productIds: { type: 'ARRAY', items: { type: 'STRING' } }
        }
      }
    },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' }
        }
      }
    },
    sources: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          id: { type: 'STRING' }
        }
      }
    }
  },
  required: ['text']
};

/**
 * Handle the AI generation loop with tools.
 */
const runMarketplaceAssistant = async (resolvedContext, userMessage) => {
  const maxRounds = parseInt(process.env.AI_MAX_TOOL_ROUNDS || '4', 10);
  const requestId = crypto.randomUUID();
  const verifiedEntityIds = new Set();
  
  // Add context to the system instructions
  let currentInstruction = SYSTEM_INSTRUCTION;
  if (resolvedContext) {
    currentInstruction += `\n\nCurrent Context:\n${JSON.stringify(resolvedContext)}`;
  }

  const messages = [
    { role: 'user', text: userMessage }
  ];

  let rounds = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  while (rounds < maxRounds) {
    rounds++;

    console.log(`[AI Orchestrator] Starting round ${rounds}/${maxRounds}`);
    // Ask Gemini
    console.log(`[AI Orchestrator] Generating content with Gemini...`);
    const response = await geminiProvider.generate({
      messages,
      tools: toolDeclarations,
      systemInstruction: currentInstruction
    });

    totalInputTokens += response.usage.inputTokens;
    totalOutputTokens += response.usage.outputTokens;

    if (response.toolCalls.length === 0) {
      console.log(`[AI Orchestrator] Model chose not to use any more tools. Proceeding to structured output.`);
      // The model is done using tools, now we force structured output
      break;
    }

    console.log(`[AI Orchestrator] Model requested ${response.toolCalls.length} tool calls.`);
    // Process tool calls
    messages.push({ role: 'model', toolCalls: response.toolCalls });

    const toolResponses = [];
    for (const call of response.toolCalls) {
      console.log(`[AI Orchestrator] Executing tool: ${call.name} with args:`, call.args);
      try {
        const result = await executeTool(call.name, call.args);
        console.log(`[AI Orchestrator] Tool ${call.name} execution successful. Returning result to AI.`);
        toolResponses.push({ name: call.name, response: result });

        // Collect verified IDs for grounding
        if (Array.isArray(result)) {
          result.forEach(r => r.productId && verifiedEntityIds.add(r.productId));
        } else if (result.productId) {
          verifiedEntityIds.add(result.productId);
        }
      } catch (err) {
        console.error(`Tool execution error [${call.name}]:`, err.message);
        toolResponses.push({ name: call.name, response: { error: err.message } });
      }
    }

    messages.push({ role: 'user', toolResponses });
  }

  // Force Structured output
  messages.push({ 
    role: 'user', 
    text: 'Please provide your final answer strictly conforming to the JSON schema. Ensure any product/store blocks match the data returned by the tools.' 
  });

  const structuredResponse = await geminiProvider.generateStructured({
    messages,
    schema: RESPONSE_SCHEMA,
    systemInstruction: currentInstruction
  });

  totalInputTokens += structuredResponse.usage.inputTokens;
  totalOutputTokens += structuredResponse.usage.outputTokens;

  // Validate Grounding
  const safeData = validateResponseBlocks(structuredResponse.data, verifiedEntityIds);
  safeData.requestId = requestId;

  // Minimal logging before DB usage table
  console.log(`[AI Orchestrator] Request ${requestId} complete. Rounds: ${rounds}, Input: ${totalInputTokens}, Output: ${totalOutputTokens}`);

  return safeData;
};

module.exports = {
  runMarketplaceAssistant
};
