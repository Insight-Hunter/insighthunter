import type { BizformaEnv, DashboardStats } from "../types.js";
import { listCasesByOrg } from "./case-service.js";
import { listUpcomingEvents } from "./compliance-service.js";

export async function getDashboardPayload(env: BizformaEnv, orgId: string) {
  const [cases, upcoming, taskCounts, signatureCounts, docCounts] = await Promise.all([
    listCasesByOrg(env, orgId),
    listUpcomingEvents(env, orgId, 30),
    env.BIZFORMA_DB.prepare("SELECT COUNT(*) as count FROM bizforma_tasks WHERE org_id = ?1 AND status != 'completed'").bind(orgId).first<{ count: number }>(),
    env.BIZFORMA_DB.prepare("SELECT COUNT(*) as count FROM bizforma_signatures WHERE org_id = ?1 AND status = 'pending'").bind(orgId).first<{ count: number }>(),
    env.BIZFORMA_DB.prepare("SELECT COUNT(*) as count FROM bizforma_documents WHERE org_id = ?1 AND status IN ('pending','processing')").bind(orgId).first<{ count: number }>()
  ]);

  const stats: DashboardStats = {
    total: cases.length,
    active: cases.filter((item: any) => item.status === "active").length,
    draft: cases.filter((item: any) => item.status === "draft").length,
    filed: cases.filter((item: any) => item.status === "filed").length,
    overdue: upcoming.filter((item: any) => item.status === "overdue").length,
    due_soon: upcoming.length,
    blocked: cases.filter((item: any) => item.status === "blocked").length,
    pending_signatures: Number(signatureCounts?.count ?? 0),
    open_tasks: Number(taskCounts?.count ?? 0),
    pending_documents: Number(docCounts?.count ?? 0)
  };

  const nextActions = await env.BIZFORMA_DB.prepare(`
    SELECT id, title, due_date, priority, status
    FROM bizforma_tasks
    WHERE org_id = ?1 AND status != 'completed'
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      due_date ASC
    LIMIT 10
  `).bind(orgId).all();

  const recentDocuments = await env.BIZFORMA_DB.prepare(`
    SELECT id, case_id, filename, doc_type, status, created_at
    FROM bizforma_documents
    WHERE org_id = ?1
    ORDER BY created_at DESC
    LIMIT 10
  `).bind(orgId).all();

  return {
    stats,
    cases,
    upcoming_events: upcoming,
    next_actions: nextActions.results ?? [],
    blocked_items: cases.filter((item: any) => item.status === "blocked"),
    recent_documents: recentDocuments.results ?? []
  };
}
