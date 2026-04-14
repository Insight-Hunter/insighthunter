export type EntityMatrixRule = {
  entityType: "sole_prop" | "llc" | "s_corp" | "c_corp";
  factor: string;
  weight: number;
  rationale: string;
};

export const entityMatrix: EntityMatrixRule[] = [
  {
    entityType: "sole_prop",
    factor: "lowest_setup_complexity",
    weight: 3,
    rationale: "Best when speed and minimal admin burden matter most.",
  },
  {
    entityType: "llc",
    factor: "liability_protection",
    weight: 5,
    rationale: "Strong default for owner-operated small businesses needing flexibility.",
  },
  {
    entityType: "llc",
    factor: "pass_through_tax",
    weight: 4,
    rationale: "Useful when the owner wants simpler taxation with legal separation.",
  },
  {
    entityType: "s_corp",
    factor: "owner_payroll_tax_efficiency",
    weight: 5,
    rationale: "Can improve tax efficiency when profits materially exceed reasonable salary.",
  },
  {
    entityType: "c_corp",
    factor: "venture_scale",
    weight: 5,
    rationale: "Best fit when outside equity and formal share structure matter.",
  },
];
