import { Client } from '@elastic/elasticsearch'

if (!process.env.ELASTICSEARCH_URL) {
  throw new Error('ELASTICSEARCH_URL is required. Add it to your .env file.')
}

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: process.env.ELASTICSEARCH_API_KEY 
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : undefined,
  tls: {
    rejectUnauthorized: false
  }
})

export async function testConnection() {
  try {
    const info = await esClient.info()
    console.log('Elasticsearch connected:', info.version.number)
    return true
  } catch (error) {
    console.error('Elasticsearch connection failed:', error)
    return false
  }
}

export async function ensureConnection() {
  const connected = await testConnection()
  if (!connected) {
    throw new Error('Elasticsearch connection failed')
  }
}
