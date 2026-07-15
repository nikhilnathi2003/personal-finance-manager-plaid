const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Turns a month of transactions into:
 *  - a plain-language summary
 *  - a leftover (income - spending) amount
 *  - 2-4 concrete save/invest suggestions
 * Returns structured JSON so the app can render it directly.
 */
async function generateInsights({ income, spendingByCategory, leftover, currency = 'CAD' }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are a friendly, plain-language personal finance assistant for a young person in Canada.
Do not use jargon. Be specific and practical, never generic.

Their numbers this month:
- Income: $${income} ${currency}
- Spending by category: ${JSON.stringify(spendingByCategory)}
- Leftover after spending: $${leftover} ${currency}

Respond ONLY with valid JSON, no markdown, no backticks, in exactly this shape:
{
  "summary": "2-3 sentence plain-language summary of their spending pattern",
  "flags": ["short specific observation", "another one if relevant"],
  "suggestions": [
    {"type": "save" | "invest" | "reduce_spending", "description": "specific actionable suggestion", "amount": number_or_null}
  ]
}

Rules for suggestions:
- If leftover is positive, suggest a mix of a Canadian high-interest savings account (name TFSA as a tax-advantaged option) and low-cost index investing (e.g. a Canadian robo-advisor or ETF), scaled to how much is actually left over.
- If leftover is negative or near zero, focus entirely on the biggest 1-2 categories driving overspending.
- Never suggest a specific paid product/brand as the only option — describe the type of account.
- Keep it realistic for someone earning around this income level.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Gemini returned non-JSON, raw text:', text);
    return {
      summary: 'Could not generate insights this time — please try again.',
      flags: [],
      suggestions: [],
    };
  }
}

module.exports = { generateInsights };
