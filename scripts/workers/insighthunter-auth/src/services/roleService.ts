import type { Env, Role } from "@/types";
import { getUserById, upsertRole, listOrgRoles, insertAuditLog } from "@/db/queries";
import { logger } from "@/lib/logger";

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  member: 2,
  admin:  3,
  owner:  4,
};

export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[targetRole];
}

export async function assignRole(
  env: Env,
  orgId: string,
  assignerUserId: string,
  assignerRole: Role,
  targetUserId: string,
  newRole: Role
): Promise<void> {
  if (!canAssignRole(assignerRole, newRole)) {
    throw Object.assign(
      new Error(`Your role '${assignerRole}' cannot assign '${newRole}'.`),
      { status: 403 }
    );
  }

  const targetUser = await getUserById(env.DB, targetUserId);
  if (!targetUser || targetUser.org_id !== orgId) {
    throw Object.assign(new Error("User not found in this organisation."), { status: 404 });
  }

  await upsertRole(env.DB, crypto.randomUUID(), orgId, targetUserId, newRole, assignerUserId);
  await insertAuditLog(env.DB, orgId, assignerUserId, "role_assigned", "server", {
    targetUserId,
    newRole,
  });

  logger.info("Role assigned", { orgId, targetUserId, newRole, by: assignerUserId });
}

export async function getOrgRoles(
  env: Env,
  orgId: string
): Promise<{ userId: string; role: Role; grantedBy: string; createdAt: string }[]> {
  return listOrgRoles(env.DB, orgId);
}
