import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "API-KEY",
});

export async function extractReceipt(base64Receipt) {
  const model = "gemini-1.5-flash";
  const request = {
    model,
    contents: [
      {
        inlineData: { mimeType: "image/jpeg", data: base64Receipt },
      },
      {
        text: `
        You are a professional receipt reader. Extract fields from this receipt image. 
        Only the following fields are needed:
        merchant,
        address,
        subtotal,
        tax,
        total
        line_items: {
          type: "array",
          items: {
            description
            quantity
            unit_price
            amount
        }

        Return only valid JSON.
        This is an example of a JSON format. 
        
        {
          "merchant": "Starbucks Coffee",
          "address": "123 Orchard Road, Singapore",
          "date": "2025-08-29",
          "subtotal": 9.50,
          "tax": 0.50,
          "total": 10.00,
          "line_items": [
            {
              "description": "Latte Tall",
              "quantity": 1,
              "unit_price": 5.00,
              "amount": 5.00
            },
            {
              "description": "Blueberry Muffin",
              "quantity": 1,
              "unit_price": 4.50,
              "amount": 4.50
            }
          ]
        }

        `,
      },
    ],
    generationConfig: {
      temperature: 0,
      topP: 0,
      topK: 1,
      maxOutputTokens: 1024,
      response_mime_type: "application/json",
      response_schema: {
        type: "object",
        properties: {
          merchant: { type: "string" },
          address: { type: "string" },
          date: { type: "string" },
          subtotal: { type: "number" },
          tax: { type: "number" },
          total: { type: "number" },
          line_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" },
                amount: { type: "number" },
              },
              required: ["description", "amount"],
            },
          },
        },
        required: ["merchant", "date", "total"],
      },
    },
  };

  console.log(request);
  const response = await ai.models.generateContent(request);
  return response.text;
}
