<p align="center">
  <img src="./public/favicon.svg" width="96" alt="Synth logo" />
</p>

<h1 align="center">Synth</h1>
<p align="center"><strong>AI medical visit assistant built around an Elasticsearch-powered clinical intelligence stack.</strong></p>

<p align="center">
  <code>Next.js 16</code> • <code>React 19</code> • <code>Prisma</code> • <code>Elasticsearch</code> • <code>Kibana Agent Builder</code>
</p>

---

## Overview

Synth converts clinician-patient conversations into structured, searchable clinical data and then uses that data across:

- transcription workflows
- documentation generation (summary + SOAP)
- patient-safe chat responses grounded in visit evidence
- trend analytics and medication/symptom pattern views
- optional agent orchestration through Kibana Agent Builder

The app is intentionally designed so Elasticsearch is not just "search", but the core system of record for derived clinical intelligence.

---

## Elasticsearch-First Architecture

At the center of Synth is a multi-index Elasticsearch model that captures conversation-level detail, visit artifacts, and audit actions in a way that supports:

- retrieval for patient/clinician Q&A
- historical trend analysis
- downstream automation through ES|QL tools
- transparent, traceable action logs

### High-Level Flow

```text
Audio / Transcript Input
  -> /api/transcribe (Gemini transcription)
  -> /api/transcribe/save (Prisma visit + documentation persistence)
  -> /api/finalize-visit (ES-first artifact generation path)
      -> synth_transcript_chunks (searchable utterances + ML entities)
      -> synth_visit_artifacts (summary, SOAP, meds, follow-ups)
      -> synth_audit_actions (who did what, when)
  -> /api/analytics (aggregations + pattern analysis)
  -> /api/chat (Kibana Agent Builder when configured, Gemini fallback otherwise)
```

---

## Elasticsearch Integration Deep Dive

### 1) Index Topology

Synth provisions these indices via `scripts/bootstrap.ts` and `src/lib/elasticsearch/indices.ts`:

| Index | Purpose | Key Fields |
|---|---|---|
| `synth_transcript_chunks` | Timeline-aligned transcript chunks for retrieval and entity-level search | `visit_id`, `patient_id`, `speaker`, `start_ms`, `end_ms`, `text`, `ml_entities.*` |
| `synth_documents` | Supporting file metadata and extracted text | `doc_id`, `filename`, `mime_type`, `extracted_text` |
| `synth_visit_artifacts` | Finalized visit outputs for downstream consumption | `after_visit_summary`, `soap_draft`, `medication_list_json`, `followups_json`, `extracted_entities_summary.*` |
| `synth_audit_actions` | Operational and clinical workflow audit events | `actor_id`, `actor_role`, `action_type`, `action_description`, `payload_json` |
| `synth_analytics` | Time-windowed aggregate snapshots | `period_type`, `total_visits`, `common_medications`, `common_symptoms`, `red_flags` |

### 2) Schema Strategy

The Elasticsearch schema intentionally mixes:

- `keyword` fields for exact filtering and grouping (`visit_id`, `patient_id`, medication names)
- `text` fields for full-text search (`text`, summaries, SOAP)
- `nested` fields for clinically structured sub-documents (`ml_entities.medications`, `symptoms`, `vitals`)
- `object` payloads for flexible JSON artifacts and audit payloads

This lets Synth execute exact clinical filtering and fuzzy semantic-like retrieval on the same dataset.

### 3) Medical Entity Extraction Layer

`src/lib/elasticsearch/ml.ts` provides a medical extraction pipeline that:

- identifies medications, symptoms, procedures, and vitals
- captures confidence and positional offsets
- detects red-flag symptom classes
- supports ingest-pipeline bootstrap (`medical_ner_pipeline`) through Elasticsearch ingest APIs

The extraction output is normalized into `ml_entities` to power downstream analytics and targeted retrieval.

### 4) Retrieval Patterns

`src/lib/elasticsearch/search.ts` implements retrieval primitives used by visit-finalization and assistant workflows:

- transcript multi-match search (`text^2`, `text.keyword`) with fuzziness
- highlighted evidence snippets via `<mark>` tags
- chronological replay (`start_ms` ascending)
- nested medication extraction from `ml_entities.medications`

This enables both "find me where this was said" and "summarize medication mentions" workflows from the same index.

### 5) Analytics and Clinical Signals

`src/lib/elasticsearch/aggregations.ts` implements aggregate analytics over artifact and transcript indices:

- total visit cardinality
- top medication and symptom buckets
- visits-over-time histograms
- dosage distribution and unique-patient counts for selected medications

API access is exposed through `/api/analytics` for clinician-facing dashboards and drill-downs.

### 6) Finalization + Audit Writes

When a visit is finalized (`/api/finalize-visit`):

- transcript chunks and extracted entities are consolidated
- summary + SOAP + follow-up tasks are produced
- normalized artifacts are indexed into `synth_visit_artifacts`
- workflow events are indexed into `synth_audit_actions`
- indices are refreshed to make new data queryable immediately

This gives near-immediate observability of finalized outputs in search and analytics paths.

### 7) ES|QL + Agent Builder Tooling

`src/lib/kibana/tools.ts` provisions ES|QL tools for Agent Builder, including:

- visit summary retrieval
- medication lookup
- transcript keyword search
- timeline retrieval
- follow-up extraction
- symptom retrieval

`src/lib/kibana/agents.ts` then wires these tools into three specialized agents:

- `synth_patient_agent`
- `synth_clinician_agent`
- `synth_triage_agent`

This creates a practical "search + analysis + action" loop over the same Elasticsearch-backed corpus.

### 8) Resilience Behavior

Several flows are written ES-first with guarded fallback behavior where possible:

- finalization attempts Elasticsearch retrieval first, then falls back to persisted transcript JSON and local extraction
- analytics routes return safe empty payloads when Elasticsearch-backed analytics are unavailable
- clinician chat attempts Kibana Agent Builder first, then falls back to Gemini

This keeps workflows operational while preserving a high-capability mode when Elastic infrastructure is present.

---

## Product Capabilities

- Role-based authentication for clinicians and patient-share access
- Audio transcription pipeline with speaker-labeled segments
- Visit documentation persistence (summary, SOAP, additional notes)
- Visit finalization with artifact generation and audit indexing
- Clinician analytics endpoints powered by Elasticsearch aggregations
- Patient and clinician chat with citation-aware response metadata
- Optional Agent Builder orchestration with ES|QL tool chain

---

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- Auth: NextAuth + bcrypt
- Database: Prisma + SQLite
- AI: Google Gemini (transcription + generative response layer)
- Search + Analytics: Elasticsearch (`@elastic/elasticsearch`)
- Agent Runtime (optional): Kibana Agent Builder APIs

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma SQLite connection |
| `NEXTAUTH_SECRET` | Yes | Auth session signing |
| `NEXTAUTH_URL` | Yes | Base URL for NextAuth |
| `GEMINI_API_KEY` | Yes | Transcription + generative flows |
| `ELASTICSEARCH_URL` | Required for ES features | Elasticsearch node URL |
| `ELASTICSEARCH_API_KEY` | Usually | Elasticsearch API auth |
| `KIBANA_URL` | Optional | Kibana endpoint for Agent Builder |
| `KIBANA_API_KEY` | Optional | Kibana API auth |
| `KIBANA_SPACE_ID` | Optional | Kibana space (default: `default`) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public app URL |

---

## Setup

### 1) Install Dependencies

```bash
npm install
```

### 2) Configure Environment

```bash
copy .env.example .env
```

Edit `.env` with your keys and endpoints.

### 3) Initialize Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4) Bootstrap Elasticsearch + Agent Builder (full stack)

```bash
npm run bootstrap
```

This step:

- validates Elasticsearch connectivity
- creates all Synth indices
- registers the medical NER ingest pipeline
- creates Agent Builder ES|QL tools
- creates Synth patient/clinician/triage agents

### 5) Run App

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Default Seed User

- Email: `admin@synth.health`
- Password: `synth2025`
- Role: `clinician`

---

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run bootstrap
npm run setup
```

`npm run setup` executes Prisma generate/migrate/seed + bootstrap in one command.

---

## Project Structure

```text
src/
  app/
    api/
      analytics/
      chat/
      finalize-visit/
      transcribe/
  components/
    transcribe/
    clinician/
    chat/
  lib/
    elasticsearch/
      client.ts
      indices.ts
      ml.ts
      search.ts
      aggregations.ts
    kibana/
      client.ts
      tools.ts
      agents.ts
scripts/
  bootstrap.ts
prisma/
  schema.prisma
  seed.ts
```

---

## Operational Notes

- Elasticsearch client enforces `ELASTICSEARCH_URL` at module initialization.
- Kibana integrations are optional, but required for Agent Builder conversation/tool execution.
- Finalization writes to Elasticsearch are best-effort; non-ES fallback paths are present in critical flows.

---

## Compliance and Safety Notice

Synth is a software engineering project for clinical workflow acceleration and prototyping.
It is not a medical device and does not provide medical advice.
Production healthcare usage requires your own regulatory, privacy, and security controls.

---

## License

MIT
