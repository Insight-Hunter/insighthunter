import type { Env, AuthContext } from '../types';
import type { Category, CategoryRule } from '../types/accounting';
import {
  getCategories, getCategoryRules, insertCategory, insertCategoryRule,
} from '../db/queries';

export async function handleCategories(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  const method = request.method;

  // GET /categories
  if (method === 'GET' && pathname === '/categories') {
    const categories = await getCategories(env.DB, auth.orgId);
    return Response.json({  categories });
  }

  // POST /categories
  if (method === 'POST' && pathname === '/categories') {
    const body = await request.json<any>();
    const category: Category = {
      id:        crypto.randomUUID(),
      orgId:     auth.orgId,
      name:      body.name,
      accountId: body.account_id,
      parentId:  body.parent_id ?? null,
      color:     body.color     ?? null,
      isSystem:  false,
      createdAt: new Date().toISOString(),
    };
    await insertCategory(env.DB, category);
    return Response.json({  category }, { status: 201 });
  }

  // GET /categories/rules
  if (method === 'GET' && pathname === '/categories/rules') {
    const rules = await getCategoryRules(env.DB, auth.orgId);
    return Response.json({  rules });
  }

  // POST /categories/rules
  if (method === 'POST' && pathname === '/categories/rules') {
    const body = await request.json<any>();
    const rule: CategoryRule = {
      id:         crypto.randomUUID(),
      orgId:      auth.orgId,
      categoryId: body.category_id,
      pattern:    body.pattern,
      field:      body.field ?? 'description',
      priority:   body.priority ?? 0,
      isActive:   true,
      createdAt:  new Date().toISOString(),
    };
    await insertCategoryRule(env.DB, rule);
    return Response.json({  rule }, { status: 201 });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
