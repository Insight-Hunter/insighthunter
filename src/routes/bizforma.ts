import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const bizformaRoutes = new Hono<{ Bindings: Env }>()
bizformaRoutes.use('*', requireAuth)

// ── Compliance checklist templates by entity type ─────────────
const COMPLIANCE_TEMPLATES: Record<string, Array<{ title: string; description: string; category: string; days_from_now: number }>> = {
  LLC: [
    { title: 'File Articles of Organization',    description: 'Submit to your state Secretary of State.',                           category: 'formation',           days_from_now: 30  },
    { title: 'Draft Operating Agreement',         description: 'Internal governance document for LLC members.',                      category: 'operating_agreement', days_from_now: 45  },
    { title: 'Obtain EIN from IRS',               description: 'Apply at irs.gov — free, takes ~10 minutes.',                       category: 'tax',                 days_from_now: 30  },
    { title: 'Open Business Bank Account',        description: 'Separate personal and business finances.',                           category: 'banking',             days_from_now: 45  },
    { title: 'Register for State Business Tax',   description: 'Check your state DOR for sales tax or income tax requirements.',     category: 'tax',                 days_from_now: 60  },
    { title: 'File Annual Report',                description: 'Most states require an annual LLC report and fee.',                  category: 'annual_report',       days_from_now: 365 },
    { title: 'Obtain Required Business Licenses', description: 'Check local county and city licensing requirements.',               category: 'license',             days_from_now: 60  },
    { title: 'Set Up Registered Agent',           description: 'Required in every state — can use a service or designate yourself.', category: 'formation',          days_from_now: 30  },
  ],
  'S-Corp': [
    { title: 'File Articles of Incorporation',    description: 'Submit to Secretary of State.',                                     category: 'formation',           days_from_now: 30  },
    { title: 'File IRS Form 2553 (S-Corp Election)', description: 'Must file within 75 days of incorporation.',                    category: 'tax',                 days_from_now: 75  },
    { title: 'Draft Corporate Bylaws',            description: 'Governing document for your corporation.',                          category: 'operating_agreement', days_from_now: 45  },
    { title: 'Obtain EIN from IRS',               description: 'Required before filing taxes or hiring.',                          category: 'tax',                 days_from_now: 30  },
    { title: 'Issue Stock Certificates',          description: 'Document ownership shares for all shareholders.',                   category: 'formation',           days_from_now: 60  },
    { title: 'Hold Initial Board Meeting',        description: 'Elect officers, adopt bylaws, authorize bank account.',             category: 'formation',           days_from_now: 45  },
    { title: 'File Annual Report',                description: 'Annual state filing requirement.',                                  category: 'annual_report',       days_from_now: 365 },
    { title: 'File Form 1120-S (Annual Tax)',     description: 'S-Corp income tax return due March 15.',                           category: 'tax',                 days_from_now: 365 },
  ],
  'C-Corp': [
    { title: 'File Articles of Incorporation',   description: 'Submit to Secretary of State.',                                      category: 'formation',           days_from_now: 30  },
    { title: 'Draft Corporate Bylaws',           description: 'Governing document for your corporation.',                           category: 'operating_agreement', days_from_now: 45  },
    { title: 'Obtain EIN from IRS',              description: 'Required before filing taxes or hiring.',                            category: 'tax',                 days_from_now: 30  },
    { title: 'Issue Stock Certificates',         description: 'Document ownership shares for all shareholders.',                    category: 'formation',           days_from_now: 60  },
    { title: 'Hold Initial Board Meeting',       description: 'Elect officers, adopt bylaws, authorize bank account.',              category: 'formation',           days_from_now: 45  },
    { title: 'File Annual Report',               description: 'Annual state filing requirement.',                                   category: 'annual_report',       days_from_now: 365 },
    { title: 'File Form 1120 (Annual Tax)',      description: 'C-Corp income tax return due April 15.',                            category: 'tax',                 days_from_now: 365 },
    { title: 'Register for State Business Tax',  description: 'Check your state DOR requirements.',                                category: 'tax',                 days_from_now: 60  },
  ],
  'Sole Proprietorship': [
    { title: 'File DBA (Doing Business As)',     description: 'Required if operating under a name other than your own.',           category: 'formation',           days_from_now: 30  },
    { title: 'Obtain EIN or Use SSN',            description: 'EIN recommended to separate personal/business taxes.',              category: 'tax',                 days_from_now: 30  },
    { title: 'Open Business Bank Account',       description: 'Separate personal and business finances.',                          category: 'banking',             days_from_now: 30  },
    { title: 'Register for State Sales Tax',     description: 'If selling taxable goods/services in your state.',                  category: 'tax',                 days_from_now: 45  },
    { title: 'Obtain Required Licenses',         description: 'Check local city/county licensing requirements.',                   category: 'license',             days_from_now: 45  },
    { title: 'File Schedule C with Tax Return',  description: 'Report business profit/loss on personal return (Form 1040).',      category: 'tax',                 days_from_now: 365 },
  ],
}

// ── Formations ────────────────────────────────────────────────

bizformaRoutes.get('/formations', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM formations WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC`
  ).bind(userId).all()
  return c.json({ formations: rows.results })
})

bizformaRoutes.get('/formations/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const [formation, compliance] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM formations WHERE id=? AND user_id=? AND deleted_at IS NULL`
    ).bind(id, userId).first(),
    c.env.DB.prepare(
      `SELECT * FROM formation_compliance WHERE formation_id=? ORDER BY due_date ASC`
    ).bind(id).all()
  ])
  if (!formation) return c.json({ error: 'Not found' }, 404)
  return c.json({ formation, compliance: compliance.results })
})

bizformaRoutes.post('/formations', async c => {
  const userId = c.get('userId') as string
  const plan   = c.get('userPlan') as string
  const body   = await c.req.json<any>()
  const { business_name, entity_type, state_of_formation, ein } = body

  if (!business_name || !entity_type)
    return c.json({ error: 'business_name and entity_type required' }, 400)

  // Plan entity limits
  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) as n FROM formations WHERE user_id=? AND deleted_at IS NULL`
  ).bind(userId).first<{ n: number }>()
  const limit = plan === 'free' ? 1 : plan === 'starter' ? 3 : 9999
  if ((count?.n ?? 0) >= limit)
    return c.json({ error: `Your ${plan} plan supports up to ${limit} entities. Upgrade to add more.` }, 403)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO formations (id,user_id,business_name,entity_type,state_of_formation,ein,status,created_at)
    VALUES (?,?,?,?,?,?,'active',?)
  `).bind(id, userId, business_name, entity_type, state_of_formation??null, ein??null, new Date().toISOString()).run()

  // Auto-generate compliance checklist from template
  const template = COMPLIANCE_TEMPLATES[entity_type] ?? COMPLIANCE_TEMPLATES['LLC']
  const now = new Date()
  const complianceStmts = template.map(item => {
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + item.days_from_now)
    return c.env.DB.prepare(`
      INSERT INTO formation_compliance (id,formation_id,title,description,due_date,category)
      VALUES (?,?,?,?,?,?)
    `).bind(crypto.randomUUID(), id, item.title, item.description, dueDate.toISOString().slice(0, 10), item.category)
  })
  if (complianceStmts.length) await c.env.DB.batch(complianceStmts)

  c.env.ANALYTICS.writeDataPoint({ blobs:['formation_created', entity_type], doubles:[1], indexes:[userId] })
  return c.json({ id, compliance_items_created: complianceStmts.length }, 201)
})

bizformaRoutes.patch('/formations/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const body   = await c.req.json<any>()
  const fields = ['business_name','entity_type','state_of_formation','ein','status']
    .filter(k => body[k] !== undefined)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  const sets = fields.map(f => `${f}=?`).join(',')
  const vals = fields.map(f => body[f])
  await c.env.DB.prepare(
    `UPDATE formations SET ${sets}, updated_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL`
  ).bind(...vals, new Date().toISOString(), id, userId).run()
  return c.json({ ok: true })
})

bizformaRoutes.delete('/formations/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  await c.env.DB.prepare(
    `UPDATE formations SET deleted_at=? WHERE id=? AND user_id=?`
  ).bind(new Date().toISOString(), id, userId).run()
  return c.json({ ok: true })
})

// ── Compliance Items ──────────────────────────────────────────

bizformaRoutes.patch('/compliance/:id/complete', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  // Verify ownership via join
  const item = await c.env.DB.prepare(`
    SELECT fc.id FROM formation_compliance fc
    JOIN formations f ON fc.formation_id=f.id
    WHERE fc.id=? AND f.user_id=?
  `).bind(id, userId).first()
  if (!item) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(
    `UPDATE formation_compliance SET completed_at=? WHERE id=?`
  ).bind(new Date().toISOString(), id).run()
  c.env.ANALYTICS.writeDataPoint({ blobs:['compliance_completed'], doubles:[1], indexes:[userId] })
  return c.json({ ok: true })
})

bizformaRoutes.patch('/compliance/:id/uncomplete', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const item = await c.env.DB.prepare(`
    SELECT fc.id FROM formation_compliance fc
    JOIN formations f ON fc.formation_id=f.id
    WHERE fc.id=? AND f.user_id=?
  `).bind(id, userId).first()
  if (!item) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(
    `UPDATE formation_compliance SET completed_at=NULL WHERE id=?`
  ).bind(id).run()
  return c.json({ ok: true })
})

bizformaRoutes.post('/compliance', async c => {
  const userId = c.get('userId') as string
  const body   = await c.req.json<any>()
  const { formation_id, title, description, due_date, category } = body
  if (!formation_id || !title) return c.json({ error: 'formation_id and title required' }, 400)
  // Verify ownership
  const f = await c.env.DB.prepare(
    `SELECT id FROM formations WHERE id=? AND user_id=? AND deleted_at IS NULL`
  ).bind(formation_id, userId).first()
  if (!f) return c.json({ error: 'Formation not found' }, 404)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO formation_compliance (id,formation_id,title,description,due_date,category)
    VALUES (?,?,?,?,?,?)
  `).bind(id, formation_id, title, description??null, due_date??null, category??'other').run()
  return c.json({ id }, 201)
})
