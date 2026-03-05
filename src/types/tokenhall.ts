// OpenRouter-compatible types for TokenHall

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ProviderRouting {
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  order?: string[];
  only?: string[];
  ignore?: string[];
  sort?: { by: "price" | "throughput" | "latency" };
  max_price?: { prompt?: number; completion?: number };
  data_collection?: "allow" | "deny";
}

export interface ChatCompletionRequest {
  model: string;
  models?: string[];
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  response_format?: { type: "text" | "json_object" | "json_schema"; json_schema?: Record<string, unknown> };
  seed?: number;
  user?: string;
  provider?: ProviderRouting;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
}

export interface ChatStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: {
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }[];
  usage?: TokenUsage;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  context_length: number;
  max_output_tokens: number | null;
  pricing: {
    prompt: string; // per 1M tokens
    completion: string;
  };
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_vision: boolean;
}

export interface TokenHallApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  label: string | null;
  agent_id: string | null;
  account_id: string | null;
  is_management_key: boolean;
  credit_limit: number | null;
  credit_used: number;
  rate_limit_rpm: number;
  allowed_models: string[] | null;
  revoked: boolean;
  created_at: string;
}

export interface CreditBalance {
  total_purchased: string;
  total_earned: string;
  total_spent: string;
  balance: string;
  main_wallet_balance?: string;
  sub_wallet_balance?: string;
  combined_wallet_balance?: string;
  wallets?: {
    primary: WalletSummary | null;
    main: WalletSummary | null;
    agents: WalletSummary[];
  };
  wallet_transfers?: WalletTransfer[];
}

export interface WalletSummary {
  owner_type: "account" | "agent";
  wallet_address: string;
  account_id: string | null;
  agent_id: string | null;
  balance: string;
  total_transferred_in: string;
  total_transferred_out: string;
}

export interface WalletTransfer {
  id: string;
  from_wallet_address: string;
  to_wallet_address: string;
  from_owner_type: "account" | "agent";
  to_owner_type: "account" | "agent";
  from_account_id: string | null;
  to_account_id: string | null;
  from_agent_id: string | null;
  to_agent_id: string | null;
  amount: string;
  memo: string | null;
  initiated_by_type: "account" | "agent" | "system";
  initiated_by_account_id: string | null;
  initiated_by_agent_id: string | null;
  created_at: string;
}
