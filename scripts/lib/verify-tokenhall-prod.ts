type ArgValue = string | boolean;

export type ParsedArgs = Record<string, ArgValue>;

export interface ResolvedAdminCredentials {
  email: string;
  password: string;
  isComplete: boolean;
  note: string | null;
}

export type FundingStrategy =
  | "admin-api"
  | "service-role"
  | "continue-with-byok"
  | "continue-without-funding";

interface FundingStrategyInput {
  adminCredentials: ResolvedAdminCredentials;
  supabaseUrl: string;
  serviceRoleKey: string;
  openrouterApiKey: string;
}

function readTrimmedString(value: string | boolean | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveAdminCredentials(
  args: ParsedArgs,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedAdminCredentials {
  const email = readTrimmedString(args["admin-email"]) || readTrimmedString(env.ADMIN_EMAIL);
  const password =
    readTrimmedString(args["admin-password"]) || readTrimmedString(env.ADMIN_PASSWORD);

  if (email && password) {
    return {
      email,
      password,
      isComplete: true,
      note: null,
    };
  }

  if (email || password) {
    return {
      email,
      password,
      isComplete: false,
      note:
        "Admin credentials are incomplete. Skipping admin login and falling back to safer funding paths.",
    };
  }

  return {
    email: "",
    password: "",
    isComplete: false,
    note:
      "Admin credentials missing. Skipping admin login and falling back to safer funding paths.",
  };
}

export function buildFundingStrategies({
  adminCredentials,
  supabaseUrl,
  serviceRoleKey,
  openrouterApiKey,
}: FundingStrategyInput): FundingStrategy[] {
  const strategies: FundingStrategy[] = [];

  if (adminCredentials.isComplete) {
    strategies.push("admin-api");
  }

  if (supabaseUrl.trim() && serviceRoleKey.trim()) {
    strategies.push("service-role");
  }

  if (openrouterApiKey.trim()) {
    strategies.push("continue-with-byok");
  } else {
    strategies.push("continue-without-funding");
  }

  return strategies;
}
