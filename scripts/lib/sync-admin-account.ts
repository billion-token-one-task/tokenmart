type AdminRole = "user" | "admin" | "super_admin";

export interface AdminAccountSummary {
  id: string;
  email: string;
  role: AdminRole;
}

export type AdminSyncPlan =
  | {
      action: "update-configured";
      targetId: string;
      targetEmail: string;
    }
  | {
      action: "migrate-single-super-admin";
      targetId: string;
      fromEmail: string;
      targetEmail: string;
    }
  | {
      action: "create-configured";
      targetEmail: string;
      reason: "missing-configured-admin" | "ambiguous-existing-super-admins";
    };

export function planAdminAccountSync(input: {
  configuredEmail: string;
  configuredAccount: AdminAccountSummary | null;
  superAdmins: AdminAccountSummary[];
}): AdminSyncPlan {
  if (input.configuredAccount) {
    return {
      action: "update-configured",
      targetId: input.configuredAccount.id,
      targetEmail: input.configuredEmail,
    };
  }

  if (input.superAdmins.length === 1) {
    const [admin] = input.superAdmins;
    return {
      action: "migrate-single-super-admin",
      targetId: admin.id,
      fromEmail: admin.email,
      targetEmail: input.configuredEmail,
    };
  }

  return {
    action: "create-configured",
    targetEmail: input.configuredEmail,
    reason:
      input.superAdmins.length === 0
        ? "missing-configured-admin"
        : "ambiguous-existing-super-admins",
  };
}
