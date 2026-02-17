import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required. Add it to your .env file.')
}

const genAI = new GoogleGenerativeAI(apiKey)

export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  return genAI.getGenerativeModel({ model: modelName })
}

export { genAI }
