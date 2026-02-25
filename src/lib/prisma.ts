/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient, getSupabaseAdminClient } from '@/lib/supabase-admin'

type AnyRecord = Record<string, any>
type DbDelegate = {
  findUnique: (args?: AnyRecord) => Promise<AnyRecord | null>
  findFirst: (args?: AnyRecord) => Promise<AnyRecord | null>
  findMany: (args?: AnyRecord) => Promise<AnyRecord[]>
  create: (args?: AnyRecord) => Promise<AnyRecord>
  update: (args?: AnyRecord) => Promise<AnyRecord>
  upsert: (args?: AnyRecord) => Promise<AnyRecord>
}
type DbAdapter = {
  $connect: () => Promise<void>
  $disconnect: () => Promise<void>
  $transaction: <T>(callback: (tx: DbAdapter) => Promise<T>) => Promise<T>
  user: DbDelegate
  patient: DbDelegate
  visit: DbDelegate
  visitDocumentation: DbDelegate
  shareLink: DbDelegate
  appointment: DbDelegate
  carePlanItem: DbDelegate
  generatedReport: DbDelegate
}
type DbErrorLike = { code?: string; message?: string; details?: string | null; hint?: string | null }

type OrderByInput =
  | Record<string, 'asc' | 'desc'>
  | Array<Record<string, 'asc' | 'desc'>>
  | undefined

const TABLES = {
  user: 'User',
  patient: 'Patient',
  visit: 'Visit',
  visitDocumentation: 'VisitDocumentation',
  shareLink: 'ShareLink',
  appointment: 'Appointment',
  carePlanItem: 'CarePlanItem',
  generatedReport: 'GeneratedReport',
} as const

const TABLE_META: Record<string, { hasId?: boolean; createdAt?: boolean; updatedAt?: boolean }> = {
  [TABLES.user]: { hasId: true, createdAt: true },
  [TABLES.patient]: { hasId: true, createdAt: true },
  [TABLES.visit]: { hasId: true },
  [TABLES.visitDocumentation]: { hasId: true, createdAt: true, updatedAt: true },
  [TABLES.shareLink]: { hasId: true, createdAt: true },
  [TABLES.appointment]: { hasId: true, createdAt: true, updatedAt: true },
  [TABLES.carePlanItem]: { hasId: true, createdAt: true, updatedAt: true },
  [TABLES.generatedReport]: { hasId: true, createdAt: true, updatedAt: true },
}

function getNowIso() {
  return new Date().toISOString()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serializeForDb<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeForDb(item)) as T
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue
      result[key] = serializeForDb(item)
    }
    return result as T
  }
  return value
}

function maybeDateKey(key: string) {
  return key.endsWith('At') || key === 'dateOfBirth' || key === 'scheduledFor'
}

function reviveDatesDeep<T>(value: T, keyHint?: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => reviveDatesDeep(item)) as T
  }
  if (typeof value === 'string' && keyHint && maybeDateKey(keyHint)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed as T
    }
    return value
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      result[key] = reviveDatesDeep(item as unknown, key)
    }
    return result as T
  }
  return value
}

function applyOrder<T extends AnyRecord>(rows: T[], orderBy: OrderByInput): T[] {
  if (!orderBy) return rows
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy]
  const sorted = [...rows]
  sorted.sort((a, b) => {
    for (const clause of clauses) {
      const [key, direction] = Object.entries(clause)[0] ?? []
      if (!key) continue
      const aValue = a[key]
      const bValue = b[key]

      const aComparable = aValue instanceof Date ? aValue.getTime() : aValue
      const bComparable = bValue instanceof Date ? bValue.getTime() : bValue

      if (aComparable === bComparable) continue
      const comparison = aComparable > bComparable ? 1 : -1
      return direction === 'desc' ? -comparison : comparison
    }
    return 0
  })
  return sorted
}

function applyTake<T>(rows: T[], take?: number) {
  if (typeof take !== 'number') return rows
  return rows.slice(0, take)
}

function buildError(op: string, error: DbErrorLike) {
  const wrapped = new Error(`${op} failed: ${error.message ?? 'Unknown Supabase error'}`) as Error & {
    code?: string
    details?: string | null
    hint?: string | null
  }
  wrapped.code = error.code
  wrapped.details = error.details ?? null
  wrapped.hint = error.hint ?? null
  return wrapped
}

function ensure<T>(op: string, result: { data: T | null; error: DbErrorLike | null }) {
  if (result.error) {
    throw buildError(op, result.error)
  }
  return reviveDatesDeep(result.data as T)
}

function prepareInsert(table: string, data: AnyRecord) {
  const meta = TABLE_META[table] ?? {}
  const payload: AnyRecord = { ...data }
  const nowIso = getNowIso()
  if (meta.hasId && !payload.id) payload.id = randomUUID()
  if (meta.createdAt && payload.createdAt === undefined) payload.createdAt = nowIso
  if (meta.updatedAt && payload.updatedAt === undefined) payload.updatedAt = nowIso
  return serializeForDb(payload)
}

function prepareUpdate(table: string, data: AnyRecord) {
  const meta = TABLE_META[table] ?? {}
  const payload: AnyRecord = { ...data }
  if (meta.updatedAt && payload.updatedAt === undefined) {
    payload.updatedAt = getNowIso()
  }
  return serializeForDb(payload)
}

function selectAll(client: SupabaseClient<any>, table: string) {
  return client.from(table).select('*') as any
}

async function fetchByEq(
  client: SupabaseClient<any>,
  table: string,
  key: string,
  value: unknown
) {
  const result = await selectAll(client, table).eq(key, serializeForDb(value)).maybeSingle()
  return ensure<any | null>(`${table}.fetchByEq(${key})`, result)
}

async function fetchManyByEq(
  client: SupabaseClient<any>,
  table: string,
  key: string,
  value: unknown,
  options?: { orderBy?: OrderByInput; limit?: number }
) {
  let query = selectAll(client, table).eq(key, serializeForDb(value))
  const clauses = options?.orderBy ? (Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]) : []
  for (const clause of clauses) {
    const [orderKey, dir] = Object.entries(clause)[0] ?? []
    if (orderKey) {
      query = query.order(orderKey, { ascending: dir !== 'desc' })
    }
  }
  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit)
  }
  const result = await query
  return ensure<any[]>(`${table}.fetchManyByEq(${key})`, result) ?? []
}

async function fetchManyByIn(
  client: SupabaseClient<any>,
  table: string,
  key: string,
  values: unknown[],
  options?: { orderBy?: OrderByInput; limit?: number }
) {
  if (values.length === 0) return []
  let query = selectAll(client, table).in(key, values.map((value) => serializeForDb(value)))
  const clauses = options?.orderBy ? (Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]) : []
  for (const clause of clauses) {
    const [orderKey, dir] = Object.entries(clause)[0] ?? []
    if (orderKey) {
      query = query.order(orderKey, { ascending: dir !== 'desc' })
    }
  }
  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit)
  }
  const result = await query
  return ensure<any[]>(`${table}.fetchManyByIn(${key})`, result) ?? []
}

async function fetchAll(client: SupabaseClient<any>, table: string) {
  const result = await selectAll(client, table)
  return ensure<any[]>(`${table}.fetchAll`, result) ?? []
}

async function insertRow(client: SupabaseClient<any>, table: string, data: AnyRecord) {
  const result = await client
    .from(table)
    .insert(prepareInsert(table, data))
    .select('*')
    .single()
  return ensure<any>(`${table}.insert`, result)
}

async function updateByEq(
  client: SupabaseClient<any>,
  table: string,
  key: string,
  value: unknown,
  data: AnyRecord
) {
  const result = await client
    .from(table)
    .update(prepareUpdate(table, data))
    .eq(key, serializeForDb(value))
    .select('*')
    .single()
  return ensure<any>(`${table}.update`, result)
}

async function listVisitsWithRelations(
  client: SupabaseClient<any>,
  visits: AnyRecord[],
  include: AnyRecord | undefined
) {
  if (!include || visits.length === 0) return visits

  const withRelations = visits.map((visit) => ({ ...visit }))
  const byId = new Map(withRelations.map((visit) => [visit.id, visit]))

  if (include.patient) {
    const patientIds = Array.from(new Set(withRelations.map((visit) => visit.patientId).filter(Boolean)))
    const patients = await fetchManyByIn(client, TABLES.patient, 'id', patientIds)
    const patientMap = new Map(patients.map((patient) => [patient.id, patient]))
    for (const visit of withRelations) {
      visit.patient = patientMap.get(visit.patientId) ?? null
    }
  }

  if (include.documentation) {
    const visitIds = withRelations.map((visit) => visit.id)
    const docs = await fetchManyByIn(client, TABLES.visitDocumentation, 'visitId', visitIds)
    const docMap = new Map(docs.map((doc) => [doc.visitId, doc]))
    for (const visit of withRelations) {
      visit.documentation = docMap.get(visit.id) ?? null
    }
  }

  if (include.shareLinks) {
    const visitIds = withRelations.map((visit) => visit.id)
    const allLinks = await fetchManyByIn(client, TABLES.shareLink, 'visitId', visitIds)
    for (const visit of withRelations) {
      let links = allLinks.filter((link) => link.visitId === visit.id)
      const shareOpts = include.shareLinks
      if (isPlainObject(shareOpts) && isPlainObject(shareOpts.where)) {
        if ('revokedAt' in shareOpts.where && shareOpts.where.revokedAt === null) {
          links = links.filter((link) => link.revokedAt === null)
        }
      }
      links = applyOrder(links, isPlainObject(shareOpts) ? (shareOpts.orderBy as OrderByInput) : undefined)
      links = applyTake(links, isPlainObject(shareOpts) ? (shareOpts.take as number | undefined) : undefined)
      visit.shareLinks = links
    }
  }

  if (include.appointments) {
    const visitIds = withRelations.map((visit) => visit.id)
    const allAppointments = await fetchManyByIn(client, TABLES.appointment, 'visitId', visitIds)
    for (const visit of withRelations) {
      let appointments = allAppointments.filter((row) => row.visitId === visit.id)
      const apptOpts = include.appointments
      const apptWhere =
        isPlainObject(apptOpts) && isPlainObject(apptOpts.where) ? apptOpts.where : null
      if (apptWhere && isPlainObject(apptWhere.scheduledFor)) {
        const gte = apptWhere.scheduledFor.gte
        if (gte) {
          const threshold =
            gte instanceof Date ? gte.getTime() : new Date(String(gte)).getTime()
          appointments = appointments.filter(
            (row) => row.scheduledFor instanceof Date && row.scheduledFor.getTime() >= threshold
          )
        }
      }
      appointments = applyOrder(
        appointments,
        isPlainObject(apptOpts) ? (apptOpts.orderBy as OrderByInput) : undefined
      )
      appointments = applyTake(appointments, isPlainObject(apptOpts) ? (apptOpts.take as number | undefined) : undefined)
      visit.appointments = appointments
    }
  }

  if (include.carePlanItems) {
    const visitIds = withRelations.map((visit) => visit.id)
    const allItems = await fetchManyByIn(client, TABLES.carePlanItem, 'visitId', visitIds)
    for (const visit of withRelations) {
      const itemOpts = include.carePlanItems
      let items = allItems.filter((row) => row.visitId === visit.id)
      items = applyOrder(items, isPlainObject(itemOpts) ? (itemOpts.orderBy as OrderByInput) : undefined)
      items = applyTake(items, isPlainObject(itemOpts) ? (itemOpts.take as number | undefined) : undefined)
      visit.carePlanItems = items
    }
  }

  return withRelations
}

async function listDocsWithVisitRelations(
  client: SupabaseClient<any>,
  docs: AnyRecord[],
  opts: { include?: AnyRecord; select?: AnyRecord; where?: AnyRecord; orderBy?: OrderByInput; take?: number }
) {
  let filteredDocs = [...docs]
  const needsVisitJoin =
    Boolean(opts.include?.visit) || Boolean(opts.select?.visit) || Boolean(opts.where?.visit)

  if (needsVisitJoin) {
    const visitIds = Array.from(new Set(filteredDocs.map((doc) => doc.visitId)))
    let visits = await fetchManyByIn(client, TABLES.visit, 'id', visitIds)
    const needsPatientJoin =
      Boolean(opts.where?.visit?.patient) ||
      Boolean(opts.include?.visit?.include?.patient) ||
      Boolean(opts.select?.visit?.select?.patient) ||
      Boolean(opts.include?.visit?.patient)

    let patientMap = new Map<string, AnyRecord>()
    if (needsPatientJoin) {
      const patientIds = Array.from(new Set(visits.map((visit) => visit.patientId).filter(Boolean)))
      const patients = await fetchManyByIn(client, TABLES.patient, 'id', patientIds)
      patientMap = new Map(patients.map((patient) => [patient.id, patient]))
      visits = visits.map((visit) => ({ ...visit, patient: patientMap.get(visit.patientId) ?? null }))
    }

    if (opts.where?.visit?.clinicianId) {
      filteredDocs = filteredDocs.filter((doc) => {
        const visit = visits.find((candidate) => candidate.id === doc.visitId)
        return visit?.clinicianId === opts.where?.visit?.clinicianId
      })
    }

    if (opts.where?.visit?.patient?.displayName) {
      filteredDocs = filteredDocs.filter((doc) => {
        const visit = visits.find((candidate) => candidate.id === doc.visitId)
        return visit?.patient?.displayName === opts.where?.visit?.patient?.displayName
      })
    }

    if (opts.include?.visit || opts.select?.visit) {
      const visitMap = new Map(visits.map((visit) => [visit.id, visit]))
      filteredDocs = filteredDocs.map((doc) => ({ ...doc, visit: visitMap.get(doc.visitId) ?? null }))
    }
  }

  filteredDocs = applyOrder(filteredDocs, opts.orderBy)
  filteredDocs = applyTake(filteredDocs, opts.take)
  return filteredDocs
}

function createAdapter(client: SupabaseClient<any>): DbAdapter {
  const unsupported = (name: string) => async () => {
    throw new Error(`Unsupported adapter method: ${name}`)
  }
  const makeDelegate = (partial: AnyRecord, label: string): DbDelegate => ({
    findUnique: (partial.findUnique as DbDelegate['findUnique']) ?? unsupported(`${label}.findUnique`),
    findFirst: (partial.findFirst as DbDelegate['findFirst']) ?? unsupported(`${label}.findFirst`),
    findMany: (partial.findMany as DbDelegate['findMany']) ?? unsupported(`${label}.findMany`),
    create: (partial.create as DbDelegate['create']) ?? unsupported(`${label}.create`),
    update: (partial.update as DbDelegate['update']) ?? unsupported(`${label}.update`),
    upsert: (partial.upsert as DbDelegate['upsert']) ?? unsupported(`${label}.upsert`),
  } as DbDelegate)

  const adapter: DbAdapter = {
    async $connect() {
      return
    },
    async $disconnect() {
      return
    },
    async $transaction<T>(callback: (tx: DbAdapter) => Promise<T>) {
      // Supabase REST has no multi-step transaction primitive here; preserve call shape.
      return callback(createAdapter(client))
    },

    user: makeDelegate({
      async findUnique(args: AnyRecord) {
        const where = args?.where ?? {}
        if (where.id) return fetchByEq(client, TABLES.user, 'id', where.id)
        if (where.email) return fetchByEq(client, TABLES.user, 'email', where.email)
        return null
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.user, args?.data ?? {})
      },
      async update(args: AnyRecord) {
        if (!args?.where?.id) throw new Error('User.update requires where.id')
        return updateByEq(client, TABLES.user, 'id', args.where.id, args?.data ?? {})
      },
      async upsert(args: AnyRecord) {
        const email = args?.where?.email
        if (!email) throw new Error('User.upsert requires where.email')
        const existing = await fetchByEq(client, TABLES.user, 'email', email)
        if (existing) {
          const updateData = args?.update ?? {}
          if (Object.keys(updateData).length === 0) {
            return existing
          }
          return updateByEq(client, TABLES.user, 'id', existing.id, updateData)
        }
        return insertRow(client, TABLES.user, args?.create ?? {})
      },
    }, 'user'),

    patient: makeDelegate({
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.patient, args?.data ?? {})
      },
    }, 'patient'),

    visit: makeDelegate({
      async findUnique(args: AnyRecord) {
        const where = args?.where ?? {}
        const visit = where.id
          ? await fetchByEq(client, TABLES.visit, 'id', where.id)
          : where.patientId && where.clinicianId
            ? (await (async () => {
                const rows = await fetchManyByEq(client, TABLES.visit, 'patientId', where.patientId)
                return rows.find((row) => row.clinicianId === where.clinicianId) ?? null
              })())
            : null

        if (!visit) return null
        if (args?.include) {
          const [withRelations] = await listVisitsWithRelations(client, [visit], args.include)
          return withRelations ?? null
        }
        return visit
      },
      async findMany(args: AnyRecord = {}) {
        const where = args.where ?? {}
        let rows: AnyRecord[]

        if (where.clinicianId) {
          rows = await fetchManyByEq(client, TABLES.visit, 'clinicianId', where.clinicianId)
        } else if (where.patientId) {
          rows = await fetchManyByEq(client, TABLES.visit, 'patientId', where.patientId)
        } else if (where.status) {
          rows = await fetchManyByEq(client, TABLES.visit, 'status', where.status)
        } else {
          rows = await fetchAll(client, TABLES.visit)
        }

        rows = applyOrder(rows, args.orderBy)
        rows = applyTake(rows, args.take)
        if (args.include) {
          rows = await listVisitsWithRelations(client, rows, args.include)
        }
        return rows
      },
      async create(args: AnyRecord) {
        const created = await insertRow(client, TABLES.visit, args?.data ?? {})
        if (args?.include) {
          const [withRelations] = await listVisitsWithRelations(client, [created], args.include)
          return withRelations ?? created
        }
        return created
      },
      async update(args: AnyRecord) {
        if (!args?.where?.id) throw new Error('Visit.update requires where.id')
        return updateByEq(client, TABLES.visit, 'id', args.where.id, args?.data ?? {})
      },
    }, 'visit'),

    visitDocumentation: makeDelegate({
      async findUnique(args: AnyRecord) {
        const where = args?.where ?? {}
        let doc = null
        if (where.id) {
          doc = await fetchByEq(client, TABLES.visitDocumentation, 'id', where.id)
        } else if (where.visitId) {
          doc = await fetchByEq(client, TABLES.visitDocumentation, 'visitId', where.visitId)
        }
        if (!doc) return null
        if (args?.include?.visit || args?.select?.visit) {
          const docs = await listDocsWithVisitRelations(client, [doc], {
            include: args.include,
            select: args.select,
          })
          return docs[0] ?? null
        }
        return doc
      },
      async findFirst(args: AnyRecord = {}) {
        const rows = await adapter.visitDocumentation.findMany({ ...args, take: 1 })
        return rows[0] ?? null
      },
      async findMany(args: AnyRecord = {}) {
        let docs: AnyRecord[]
        if (args.where?.visitId) {
          docs = await fetchManyByEq(client, TABLES.visitDocumentation, 'visitId', args.where.visitId)
        } else {
          docs = await fetchAll(client, TABLES.visitDocumentation)
        }

        docs = await listDocsWithVisitRelations(client, docs, {
          include: args.include,
          select: args.select,
          where: args.where,
          orderBy: args.orderBy,
          take: args.take,
        })

        return docs
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.visitDocumentation, args?.data ?? {})
      },
      async update(args: AnyRecord) {
        const where = args?.where ?? {}
        if (where.id) {
          return updateByEq(client, TABLES.visitDocumentation, 'id', where.id, args?.data ?? {})
        }
        if (where.visitId) {
          return updateByEq(client, TABLES.visitDocumentation, 'visitId', where.visitId, args?.data ?? {})
        }
        throw new Error('VisitDocumentation.update requires where.id or where.visitId')
      },
    }, 'visitDocumentation'),

    shareLink: makeDelegate({
      async findUnique(args: AnyRecord) {
        const where = args?.where ?? {}
        let row = null
        if (where.id) row = await fetchByEq(client, TABLES.shareLink, 'id', where.id)
        if (!row && where.token) row = await fetchByEq(client, TABLES.shareLink, 'token', where.token)
        if (!row) return null

        if (args?.include?.visit) {
          const visit = await adapter.visit.findUnique({
            where: { id: row.visitId },
            include: args.include.visit.include ?? args.include.visit,
          })
          return { ...row, visit }
        }

        return row
      },
      async findFirst(args: AnyRecord = {}) {
        const where = args.where ?? {}
        let rows = where.visitId
          ? await fetchManyByEq(client, TABLES.shareLink, 'visitId', where.visitId)
          : await fetchAll(client, TABLES.shareLink)

        if (where.revokedAt === null) {
          rows = rows.filter((row) => row.revokedAt === null)
        }

        rows = applyOrder(rows, args.orderBy)
        rows = applyTake(rows, args.take ?? 1)
        return rows[0] ?? null
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.shareLink, args?.data ?? {})
      },
    }, 'shareLink'),

    appointment: makeDelegate({
      async findMany(args: AnyRecord = {}) {
        const where = args.where ?? {}
        let rows: AnyRecord[]
        if (where.visitId) {
          rows = await fetchManyByEq(client, TABLES.appointment, 'visitId', where.visitId)
        } else if (where.clinicianId) {
          rows = await fetchManyByEq(client, TABLES.appointment, 'clinicianId', where.clinicianId)
        } else {
          rows = await fetchAll(client, TABLES.appointment)
        }

        if (where.scheduledFor && isPlainObject(where.scheduledFor) && where.scheduledFor.gte) {
          const threshold = new Date(where.scheduledFor.gte as any).getTime()
          rows = rows.filter(
            (row) => row.scheduledFor instanceof Date && row.scheduledFor.getTime() >= threshold
          )
        }

        rows = applyOrder(rows, args.orderBy)
        rows = applyTake(rows, args.take)

        if (args.include?.visit || args.select?.visit) {
          const visitIds = Array.from(new Set(rows.map((row) => row.visitId)))
          const visits = await adapter.visit.findMany({
            where: {},
            include: { patient: true },
          })
          const visitMap = new Map(
            visits.filter((visit: AnyRecord) => visitIds.includes(visit.id)).map((visit: AnyRecord) => [visit.id, visit])
          )
          rows = rows.map((row) => ({ ...row, visit: visitMap.get(row.visitId) ?? null }))
        }

        return rows
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.appointment, args?.data ?? {})
      },
    }, 'appointment'),

    carePlanItem: makeDelegate({
      async findMany(args: AnyRecord = {}) {
        const where = args.where ?? {}
        let rows: AnyRecord[]
        if (where.visitId) {
          rows = await fetchManyByEq(client, TABLES.carePlanItem, 'visitId', where.visitId)
        } else if (where.clinicianId) {
          rows = await fetchManyByEq(client, TABLES.carePlanItem, 'clinicianId', where.clinicianId)
        } else {
          rows = await fetchAll(client, TABLES.carePlanItem)
        }

        rows = applyOrder(rows, args.orderBy)
        rows = applyTake(rows, args.take)

        if (args.include?.visit || args.select?.visit) {
          const visitIds = Array.from(new Set(rows.map((row) => row.visitId)))
          const visits = await adapter.visit.findMany({
            where: {},
            include: { patient: true },
          })
          const visitMap = new Map(
            visits.filter((visit: AnyRecord) => visitIds.includes(visit.id)).map((visit: AnyRecord) => [visit.id, visit])
          )
          rows = rows.map((row) => ({ ...row, visit: visitMap.get(row.visitId) ?? null }))
        }

        return rows
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.carePlanItem, args?.data ?? {})
      },
      async findUnique(args: AnyRecord) {
        const where = args?.where ?? {}
        if (where.id) return fetchByEq(client, TABLES.carePlanItem, 'id', where.id)
        return null
      },
      async update(args: AnyRecord) {
        if (!args?.where?.id) throw new Error('CarePlanItem.update requires where.id')
        return updateByEq(client, TABLES.carePlanItem, 'id', args.where.id, args?.data ?? {})
      },
    }, 'carePlanItem'),

    generatedReport: makeDelegate({
      async findMany(args: AnyRecord = {}) {
        const where = args.where ?? {}
        let rows = where.visitId
          ? await fetchManyByEq(client, TABLES.generatedReport, 'visitId', where.visitId)
          : await fetchAll(client, TABLES.generatedReport)
        rows = applyOrder(rows, args.orderBy)
        rows = applyTake(rows, args.take)
        return rows
      },
      async create(args: AnyRecord) {
        return insertRow(client, TABLES.generatedReport, args?.data ?? {})
      },
    }, 'generatedReport'),
  }

  return adapter
}

export function getPrismaDatabaseUrl() {
  return process.env.DATABASE_URL
}

export function createPrismaClient() {
  return createAdapter(createSupabaseAdminClient())
}

const globalForAdapter = globalThis as typeof globalThis & {
  __synthDbAdapter?: DbAdapter
}

export const prisma =
  globalForAdapter.__synthDbAdapter ?? (globalForAdapter.__synthDbAdapter = createAdapter(getSupabaseAdminClient()))
