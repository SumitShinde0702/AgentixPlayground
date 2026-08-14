export type RunEvent = {
  t: number;
  lane: "rogue" | "corporate";
  phase: 1 | 2 | 3 | 4;
  status: "BLOCK" | "PASS" | "info";
  line: string;
};

export type RunLane = "rogue" | "corporate";
