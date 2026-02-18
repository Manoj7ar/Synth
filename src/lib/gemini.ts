import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey)
}

export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  if (!genAI) {
    throw new Error('Gemini is not configured. Set GEMINI_API_KEY in .env to enable AI generation.')
  }
  return genAI.getGenerativeModel({ model: modelName })
}

export { genAI }
