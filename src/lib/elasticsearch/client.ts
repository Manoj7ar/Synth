import { Client } from '@elastic/elasticsearch'

const elasticsearchUrl = process.env.ELASTICSEARCH_URL
const elasticsearchApiKey = process.env.ELASTICSEARCH_API_KEY

export function isElasticsearchConfigured(): boolean {
  return Boolean(elasticsearchUrl)
}

function missingConfigError() {
  return new Error('Elasticsearch is not configured. Set ELASTICSEARCH_URL in .env to enable search features.')
}

const realClient = elasticsearchUrl
  ? new Client({
      node: elasticsearchUrl,
      auth: elasticsearchApiKey ? { apiKey: elasticsearchApiKey } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    })
  : null

export const esClient: Client =
  realClient ??
  (new Proxy({} as Client, {
    get() {
      return () => {
        throw missingConfigError()
      }
    },
  }) as Client)

export async function testConnection() {
  if (!realClient) {
    return false
  }

  try {
    const info = await realClient.info()
    console.log('Elasticsearch connected:', info.version.number)
    return true
  } catch (error) {
    console.error('Elasticsearch connection failed:', error)
    return false
  }
}

export async function ensureConnection() {
  if (!isElasticsearchConfigured()) {
    throw missingConfigError()
  }

  const connected = await testConnection()
  if (!connected) {
    throw new Error('Elasticsearch connection failed')
  }
}
