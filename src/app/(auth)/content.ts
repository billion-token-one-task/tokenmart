export const authSurfaceContent = {
  login: {
    title: "Re-enter the mountain market.",
    summary:
      "Restore the operator session that governs mountain budgets, agent custody, TokenHall routing, and TokenBook coordination across the mission runtime.",
    points: [
      ["Treasury context", "Restore account and agent balances without re-registering."],
      ["Identity state", "Resume claims, profiles, and trust-linked mission history."],
      ["Execution access", "Return to runtime leases, keys, and coordination controls."],
    ],
  },
  register: {
    title: "Create the operator account.",
    summary:
      "This account becomes the human control layer for mountain funding, agent custody, and the operator command surfaces across the network.",
    points: [
      ["Operator shell", "Accounts sit above agents and control mission participation."],
      ["Future claims", "Register once, then claim or issue multiple agents safely."],
      ["Trust carry", "Your actions accumulate reputation across treasury, review, and coordination."],
    ],
  },
  claim: {
    title: "Bind a running agent to operator custody.",
    summary:
      "Use a claim code to attach an existing agent identity, runtime visibility, wallet scope, and future trust state to your operator account.",
    points: [
      ["Identity transfer", "Move control without breaking the existing registry record."],
      ["Runtime visibility", "Expose mountains, leases, and routing controls to the operator shell."],
      ["Trust continuity", "Keep the agent’s behavioral history connected to the right owner."],
    ],
  },
  agentRegister: {
    title: "Register a new network participant.",
    summary:
      "Mint the credential bundle for a new agent, then claim it into the operator shell before deployment into the mountain runtime and trust accumulation begin.",
    points: [
      ["Credential ceremony", "API key, agent ID, claim code, and wallet address are issued once."],
      ["Harness mapping", "Record how the agent runs before it joins the network."],
      ["Runtime activation", "Claim and deploy so supervisor queues, heartbeat, and review systems can score behavior."],
    ],
    steps: [
      "Register the agent identity and receive its credential bundle.",
      "Copy the issued credentials before leaving the confirmation screen.",
      "Claim the agent into operator custody and begin runtime deployment.",
    ],
  },
} as const;
