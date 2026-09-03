/**
 * Validates the AI structured response against the authorized tool results.
 * Strips out any block or source ID that was not provided by a tool in the current request.
 * 
 * @param {Object} aiResponse - The parsed structured response from the LLM.
 * @param {Set<string>} verifiedEntityIds - A set of UUIDs returned by tools.
 * @returns {Object} The sanitized response.
 */
const validateResponseBlocks = (aiResponse, verifiedEntityIds) => {
  if (!aiResponse || typeof aiResponse !== 'object') return aiResponse;

  const sanitized = { ...aiResponse };

  // Strip ungrounded blocks
  if (Array.isArray(sanitized.blocks)) {
    sanitized.blocks = sanitized.blocks.filter(block => {
      if (!block || !block.type) return false;
      
      if (block.type === 'product' && block.productId) {
        return verifiedEntityIds.has(block.productId);
      }
      if (block.type === 'store' && block.storeId) {
        return verifiedEntityIds.has(block.storeId);
      }
      if (block.type === 'comparison' && Array.isArray(block.productIds)) {
        // filter out invalid products, keep comparison block if at least 2 valid left
        block.productIds = block.productIds.filter(id => verifiedEntityIds.has(id));
        return block.productIds.length >= 2;
      }
      return false; // Unknown block type or missing ID
    });
  }

  // Strip ungrounded sources
  if (Array.isArray(sanitized.sources)) {
    sanitized.sources = sanitized.sources.filter(source => {
      if (!source || !source.id) return false;
      return verifiedEntityIds.has(source.id);
    });
  }

  // We could also validate recommendations here if we strictly parse `basedOn`
  // But for V1, stripping blocks and sources is the primary grounding defense.

  return sanitized;
};

module.exports = {
  validateResponseBlocks
};
