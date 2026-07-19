export type TableAmountPreset = {
  valueCents: number;
  label: string;
};

export const COP_CENTS = 100;
export const TABLE_AMOUNT_STEP_COP = 1_000;
export const TABLE_AMOUNT_STEP_CENTS = TABLE_AMOUNT_STEP_COP * COP_CENTS;

export const DEFAULT_ENTRY_PRESETS: readonly TableAmountPreset[] = [
  { valueCents: 5_000_000, label: "$50K" },
  { valueCents: 10_000_000, label: "$100K" },
  { valueCents: 20_000_000, label: "$200K" },
  { valueCents: 50_000_000, label: "$500K" },
];

export const DEFAULT_PIQUE_PRESETS: readonly TableAmountPreset[] = [
  { valueCents: 500_000, label: "$5K" },
  { valueCents: 1_000_000, label: "$10K" },
  { valueCents: 2_000_000, label: "$20K" },
  { valueCents: 5_000_000, label: "$50K" },
];
