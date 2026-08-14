type ConsoleState = {
  funding: { amount: string; currency: string; status: string; source: string };
  identity: { did: string; status: "pass" | "fail" | "idle"; reason?: string };
  card: {
    last4: string;
    status: "none" | "active" | "revoked";
    opaqueId?: string;
  };
  receipt: { id: string | null; head: string | null };
};

let state: ConsoleState = {
  funding: { amount: "12000.00", currency: "XSGD", status: "ready", source: "sandbox" },
  identity: { did: "—", status: "idle" },
  card: { last4: "—", status: "none" },
  receipt: { id: null, head: null },
};

export function getConsoleState() {
  return state;
}

export function patchConsole(partial: Partial<ConsoleState>) {
  state = { ...state, ...partial };
  return state;
}
