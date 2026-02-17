const KIBANA_URL = process.env.KIBANA_URL
const KIBANA_API_KEY = process.env.KIBANA_API_KEY
const KIBANA_SPACE = process.env.KIBANA_SPACE_ID || 'default'

export class KibanaClient {
  private baseURL: string
  private headers: Record<string, string>

  constructor() {
    if (!KIBANA_URL || !KIBANA_API_KEY) {
      console.warn('Kibana credentials not set - Agent Builder features disabled')
    }

    this.baseURL = KIBANA_SPACE === 'default' 
      ? KIBANA_URL! 
      : `${KIBANA_URL}/s/${KIBANA_SPACE}`
    
    this.headers = {
      'Authorization': `ApiKey ${KIBANA_API_KEY}`,
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json'
    }
  }

  async request(method: string, path: string, body?: any) {
    if (!KIBANA_URL || !KIBANA_API_KEY) {
      throw new Error('Kibana not configured')
    }

    const url = `${this.baseURL}${path}`
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kibana API error ${response.status}: ${error}`)
    }

    return response.json()
  }

  async get(path: string) {
    return this.request('GET', path)
  }

  async post(path: string, body: any) {
    return this.request('POST', path, body)
  }

  async put(path: string, body: any) {
    return this.request('PUT', path, body)
  }

  async delete(path: string) {
    return this.request('DELETE', path)
  }
}

export const kibanaClient = new KibanaClient()
