const productTools = require('./productTools');
// const storeTools = require('./storeTools'); // To be implemented later

/**
 * Tool Declarations for the AI Provider (OpenAPI Schema compatible)
 */
const toolDeclarations = [
  {
    name: 'searchProducts',
    description: 'Search for public, approved products by keyword, category, price, or location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Keywords to search in title/description' },
        categoryId: { type: 'STRING', description: 'UUID of the product category' },
        minPrice: { type: 'NUMBER', description: 'Minimum price' },
        maxPrice: { type: 'NUMBER', description: 'Maximum price' },
        currency: { type: 'STRING', description: 'Currency code (e.g. YER, SAR, USD)' },
        cityId: { type: 'STRING', description: 'UUID of the city' },
        limit: { type: 'INTEGER', description: 'Max results (max 10)' }
      }
    }
  },
  {
    name: 'getProduct',
    description: 'Get detailed information about a single product by its ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'The exact UUID of the product' }
      },
      required: ['productId']
    }
  },
  {
    name: 'compareProducts',
    description: 'Compare 2 to 4 products to highlight price, rating, and other details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Array of 2 to 4 product UUIDs'
        }
      },
      required: ['productIds']
    }
  },
  {
    name: 'findSimilarProducts',
    description: 'Find similar alternatives for a given product ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'UUID of the source product' },
        limit: { type: 'INTEGER', description: 'Max results (max 5)' }
      },
      required: ['productId']
    }
  }
];

/**
 * Map tool names to their implementations
 */
const executeTool = async (name, args) => {
  switch (name) {
    case 'searchProducts':
      return await productTools.searchProducts(args);
    case 'getProduct':
      return await productTools.getProduct(args);
    case 'compareProducts':
      return await productTools.compareProducts(args);
    case 'findSimilarProducts':
      return await productTools.findSimilarProducts(args);
    default:
      throw new Error(`Tool ${name} not found`);
  }
};

module.exports = {
  toolDeclarations,
  executeTool
};
