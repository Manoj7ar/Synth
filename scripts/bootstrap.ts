import { testConnection, ensureConnection } from '../src/lib/elasticsearch/client'
import { createIndices } from '../src/lib/elasticsearch/indices'
import { setupMedicalNERPipeline } from '../src/lib/elasticsearch/ml'
import { createAllTools } from '../src/lib/kibana/tools'
import { createPatientAgent, createClinicianAgent, createTriageAgent } from '../src/lib/kibana/agents'

async function bootstrap() {
  console.log('Synth Bootstrap Script\n')
  console.log('='.repeat(50))
  console.log('\n')

  try {
    console.log('Step 1: Testing Elasticsearch connection...')
    await ensureConnection()
    console.log('Elasticsearch connected\n')

    console.log('Step 2: Creating Elasticsearch indices...')
    await createIndices()
    console.log('Indices created\n')

    console.log('Step 3: Setting up Medical NER pipeline...')
    await setupMedicalNERPipeline()
    console.log('ML pipeline ready\n')

    console.log('Step 4: Creating Agent Builder tools...')
    const tools = await createAllTools()
    const toolIds = tools.map((t: any) => t.id)
    console.log(`Created ${toolIds.length} tools\n`)

    console.log('Step 5: Creating AI agents...')
    await createPatientAgent(toolIds)
    await createClinicianAgent(toolIds)
    await createTriageAgent(toolIds)
    console.log('Created 3 agents\n')

    console.log('\n')
    console.log('='.repeat(50))
    console.log('Bootstrap Complete!')
    console.log('='.repeat(50))
    console.log('\nNext steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Open: http://localhost:3000')
    console.log('\n')

  } catch (error) {
    console.error('\nBootstrap failed:', error)
    process.exit(1)
  }
}

bootstrap()
