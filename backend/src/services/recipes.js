import Anthropic from '@anthropic-ai/sdk';

import { COOKABLE_CATEGORIES } from './expirationIntelligence.js';

const MODEL = 'claude-sonnet-4-5';
const PANTRY_STAPLES = ['garlic', 'olive oil', 'salt', 'pepper', 'onion', 'eggs', 'rice', 'pasta'];

// System prompt — static, marked cacheable so repeat calls reuse it.
// Below the 1024-token cache minimum at the moment, but the cache_control
// directive is harmless and lets the cache kick in if we extend the prompt.
const SYSTEM_PROMPT = `You are a helpful cooking assistant for the FreshKeep app, which helps users use up ingredients before they spoil.

Your task: given ONE expiring ingredient and the engine's recommended action, suggest ONE simple recipe that uses that ingredient. The user always has these pantry staples on hand: ${PANTRY_STAPLES.join(', ')}.

Rules:
- Suggest exactly ONE recipe, not options. Pick the single best fit for what the user has.
- 30 minutes or less. Easy or medium difficulty.
- If recommended_action is "freeze_now", strongly prefer batch-cooking recipes (soups, sauces, stews, casseroles) that freeze well — this lets the user save the ingredient as a frozen meal for later.
- If recommended_action is "eat_now" or "use_in_recipe" with priority 1, pick something the user can make tonight from what's on hand.
- Mark each ingredient with "expiring": true if it's the user's tracked expiring item, false otherwise. Pantry staples are never "expiring".
- Steps should be concise — one short sentence each. Aim for 4–8 steps.
- Use plain ingredient names. Don't invent specialty items.`;

const RECIPE_TOOL = {
  name: 'suggest_recipe',
  description: 'Return a single recipe for the user to cook tonight using their expiring ingredient and pantry staples.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Recipe name, e.g. "Garlic spinach scramble"' },
      time:  { type: 'string', description: 'Approximate active + cook time, e.g. "15 min"' },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:     { type: 'string' },
            amount:   { type: 'string', description: 'e.g. "2 cups", "3", "to taste"' },
            expiring: { type: 'boolean', description: 'True if this is the user\'s tracked expiring item, false for pantry staples and other ingredients' },
          },
          required: ['name', 'amount', 'expiring'],
        },
      },
      steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Concise instructions, one short sentence each.',
      },
    },
    required: ['title', 'time', 'difficulty', 'ingredients', 'steps'],
  },
};

let cachedClient;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY is not set on the backend');
    err.status = 503;
    err.code = 'anthropic_not_configured';
    throw err;
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

/**
 * Suggest a recipe for an item.
 * Non-cookable items short-circuit to {type: 'reminder'} without an API call.
 */
export async function suggestRecipe(item) {
  if (!item.category || !COOKABLE_CATEGORIES.has(item.category)) {
    return reminderForItem(item);
  }

  const client = getClient();

  const userMsg =
    `Item: ${item.name}\n` +
    `Category: ${item.category}\n` +
    `Recommended action: ${item.recommended_action}\n` +
    `Days until expiry: ${item.days_until_expiry}\n` +
    `Currently ${item.opened ? 'opened' : 'unopened'} in the ${item.location}.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: [RECIPE_TOOL],
    tool_choice: { type: 'tool', name: 'suggest_recipe' },
    messages: [{ role: 'user', content: userMsg }],
  });

  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse) {
    const err = new Error('Recipe model did not return structured output');
    err.status = 502;
    err.code = 'recipe_no_tool_use';
    throw err;
  }
  return { type: 'recipe', ...toolUse.input };
}

function reminderForItem(item) {
  const tips = {
    dairy_milk:        'Drink as-is, add to coffee or smoothies, or use in cereal — milk loses quality fast once opened.',
    dairy_yogurt:      'Have it for breakfast with fruit and granola, or use as a marinade base for chicken.',
    dairy_cheese_hard: 'Grate over pasta or rice, melt on toast, or add to a charcuterie board.',
    dairy_cheese_soft: 'Spread on crackers, dollop on a salad, or warm and dip with bread.',
    dairy_butter:      'Use generously when cooking, on toast, or in baking.',
    produce_hard_fruit:'Eat fresh with peanut butter, slice into oatmeal, or add to a salad.',
    deli:              'Build a sandwich, wrap it, or chop into a salad.',
    pantry_canned:     'Once opened, transfer to a container and use within 3–5 days.',
  };
  return {
    type: 'reminder',
    title: `Use up your ${item.name}`,
    tip: tips[item.category] || 'Use this item soon to avoid waste.',
  };
}
