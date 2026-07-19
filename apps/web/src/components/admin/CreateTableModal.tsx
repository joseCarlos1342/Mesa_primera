"use client";

import { useRef, useState } from "react";
import { Plus, X, Info } from "lucide-react";
import { createTable, createCustomTable } from "@/app/actions/admin-tables";
import type { TableCategory } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";
import {
  COP_CENTS,
  DEFAULT_ENTRY_PRESETS,
  DEFAULT_PIQUE_PRESETS,
  TABLE_AMOUNT_STEP_COP,
} from "@/config/table-presets";
import { formatCurrency } from "@/utils/format";

const CHIP_DENOMS = [
  { value: 100000, label: "$1K" },
  { value: 200000, label: "$2K" },
  { value: 500000, label: "$5K" },
  { value: 1000000, label: "$10K" },
  { value: 2000000, label: "$20K" },
  { value: 5000000, label: "$50K" },
] as const;

type FinancialField = "entry" | "pique";
type FinancialErrors = Partial<Record<FinancialField, string>>;

function parseCustomCopAmount(value: string, fallbackCents: number, fieldName: string) {
  if (!value) return { cents: fallbackCents };
  if (!/^\d+$/.test(value)) return { error: `${fieldName} debe ser un monto entero en pesos COP.` };

  const pesos = Number(value);
  const cents = pesos * COP_CENTS;
  if (!Number.isSafeInteger(cents) || pesos <= 0) {
    return { error: `${fieldName} debe ser mayor a $0.` };
  }
  if (pesos % TABLE_AMOUNT_STEP_COP !== 0) {
    return { error: `El monto debe ser múltiplo de $${TABLE_AMOUNT_STEP_COP.toLocaleString("es-CO")} COP.` };
  }

  return { cents };
}

export function CreateTableModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<TableCategory>("common");
  const [customEntryCop, setCustomEntryCop] = useState("");
  const [customPiqueCop, setCustomPiqueCop] = useState("");
  const [financialErrors, setFinancialErrors] = useState<FinancialErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const entryInputRef = useRef<HTMLInputElement>(null);
  const piqueInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    max_players: 7,
    min_entry_cents: 5000000,
    min_pique_cents: 500000,
    disabled_chips: [] as number[],
  });
  const router = useRouter();

  const toggleChip = (val: number) => {
    setFormData((prev) => {
      const disabled = prev.disabled_chips.includes(val)
        ? prev.disabled_chips.filter((c) => c !== val)
        : [...prev.disabled_chips, val];
      return { ...prev, disabled_chips: disabled };
    });
  };

  const enabledChipCount = CHIP_DENOMS.length - formData.disabled_chips.length;

  const resetForm = () => {
    setFormData({ name: "", max_players: 7, min_entry_cents: 5_000_000, min_pique_cents: 500_000, disabled_chips: [] });
    setCustomEntryCop("");
    setCustomPiqueCop("");
    setFinancialErrors({});
    setSubmitError(null);
  };

  const selectPreset = (field: FinancialField, cents: number) => {
    setFormData((previous) => ({
      ...previous,
      [field === "entry" ? "min_entry_cents" : "min_pique_cents"]: cents,
    }));
    if (field === "entry") setCustomEntryCop("");
    else setCustomPiqueCop("");
    setFinancialErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const updateCustomAmount = (field: FinancialField, value: string) => {
    if (field === "entry") setCustomEntryCop(value);
    else setCustomPiqueCop(value);
    setFinancialErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    let minEntryCents = formData.min_entry_cents;
    let minPiqueCents = formData.min_pique_cents;
    if (category === "custom") {
      const entryResult = parseCustomCopAmount(customEntryCop, minEntryCents, "El saldo mínimo");
      const piqueResult = parseCustomCopAmount(customPiqueCop, minPiqueCents, "El pique mínimo");
      const errors: FinancialErrors = {};

      if ("error" in entryResult) errors.entry = entryResult.error;
      else minEntryCents = entryResult.cents;
      if ("error" in piqueResult) errors.pique = piqueResult.error;
      else minPiqueCents = piqueResult.cents;
      if (!errors.entry && !errors.pique && minEntryCents < minPiqueCents) {
        errors.entry = "El saldo mínimo debe ser mayor o igual al pique mínimo.";
      }
      if (Object.keys(errors).length > 0) {
        setFinancialErrors(errors);
        if (errors.entry) entryInputRef.current?.focus();
        else piqueInputRef.current?.focus();
        return;
      }
    }

    setLoading(true);
    try {
      if (category === "common") {
        await createTable({ name: formData.name, max_players: formData.max_players });
      } else {
        await createCustomTable({
          name: formData.name,
          max_players: formData.max_players,
          min_entry_cents: minEntryCents,
          min_pique_cents: minPiqueCents,
          disabled_chips: formData.disabled_chips,
        });
      }
      setIsOpen(false);
      router.refresh();
      resetForm();
      setCategory("common");
    } catch {
      setSubmitError("No se pudo crear la mesa. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        CREAR MESA
      </button>
    );
  }

  const isCommon = category === "common";
  const accentFrom = isCommon ? "from-emerald-500/10" : "from-amber-500/10";
  const accentColor = isCommon ? "emerald" : "amber";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1">
        <div className={`p-8 bg-gradient-to-br ${accentFrom} to-transparent`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter text-white">NUEVA MESA</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Configuración del local para &quot;Primera&quot;.</p>
            </div>
            <button aria-label="Cerrar modal" onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* Category Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setCategory("common")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                isCommon
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              Común
            </button>
            <button
              type="button"
              onClick={() => setCategory("custom")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                !isCommon
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              Personalizada
            </button>
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre de la Mesa</label>
              <input
                type="text"
                required
                placeholder={isCommon ? "Ej: Mesa #3, Mesa #4..." : "Ej: Mesa VIP, Premium..."}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Max Players */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Máx. Jugadores</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData({ ...formData, max_players: n })}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                      formData.max_players === n
                        ? `bg-${accentColor}-600 text-white shadow-lg`
                        : "bg-slate-950 text-slate-400 border border-white/5 hover:bg-white/5"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Common: info banner */}
            {isCommon && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <p className="font-bold text-emerald-400 mb-1">Mesa Común</p>
                  Saldo mínimo de entrada: <span className="font-black text-white">$50.000</span> ·
                  Pique: <span className="font-black text-white">$5.000</span> ·
                  Todas las fichas habilitadas.
                </div>
              </div>
            )}

            {/* Custom: entry, pique, chips */}
            {!isCommon && (
              <>
                {/* Min entry */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Saldo mínimo para ingresar</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_ENTRY_PRESETS.map((p) => (
                      <button
                        key={p.valueCents}
                        type="button"
                        onClick={() => selectPreset("entry", p.valueCents)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                          !customEntryCop && formData.min_entry_cents === p.valueCents
                            ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                            : "bg-slate-950 text-slate-400 border border-white/5 hover:bg-white/5"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 px-1" htmlFor="custom-min-entry-cop">
                    Otro saldo mínimo (COP)
                  </label>
                  <input
                    id="custom-min-entry-cop"
                    ref={entryInputRef}
                    name="custom-min-entry-cop"
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    min={TABLE_AMOUNT_STEP_COP}
                    step={TABLE_AMOUNT_STEP_COP}
                    value={customEntryCop}
                    onChange={(event) => updateCustomAmount("entry", event.currentTarget.value)}
                    aria-describedby={financialErrors.entry ? "custom-min-entry-error" : "custom-min-entry-help"}
                    aria-invalid={Boolean(financialErrors.entry)}
                    placeholder="Ej: 750000"
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-white font-mono tabular-nums focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-700"
                  />
                  <p id="custom-min-entry-help" className="text-[10px] text-slate-500 px-1">
                    Pesos COP enteros, en múltiplos de $1.000. Actual: {formatCurrency(customEntryCop ? Number(customEntryCop) * COP_CENTS : formData.min_entry_cents)}.
                  </p>
                  {financialErrors.entry && <p id="custom-min-entry-error" role="alert" className="text-[10px] text-red-400 px-1">{financialErrors.entry}</p>}
                </div>

                {/* Min pique */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Pique mínimo</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PIQUE_PRESETS.map((p) => (
                      <button
                        key={p.valueCents}
                        type="button"
                        onClick={() => selectPreset("pique", p.valueCents)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                          !customPiqueCop && formData.min_pique_cents === p.valueCents
                            ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                            : "bg-slate-950 text-slate-400 border border-white/5 hover:bg-white/5"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 px-1" htmlFor="custom-min-pique-cop">
                    Otro pique mínimo (COP)
                  </label>
                  <input
                    id="custom-min-pique-cop"
                    ref={piqueInputRef}
                    name="custom-min-pique-cop"
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    min={TABLE_AMOUNT_STEP_COP}
                    step={TABLE_AMOUNT_STEP_COP}
                    value={customPiqueCop}
                    onChange={(event) => updateCustomAmount("pique", event.currentTarget.value)}
                    aria-describedby={financialErrors.pique ? "custom-min-pique-error" : "custom-min-pique-help"}
                    aria-invalid={Boolean(financialErrors.pique)}
                    placeholder="Ej: 15000"
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-white font-mono tabular-nums focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-700"
                  />
                  <p id="custom-min-pique-help" className="text-[10px] text-slate-500 px-1">
                    Pesos COP enteros, en múltiplos de $1.000. Actual: {formatCurrency(customPiqueCop ? Number(customPiqueCop) * COP_CENTS : formData.min_pique_cents)}.
                  </p>
                  {financialErrors.pique && <p id="custom-min-pique-error" role="alert" className="text-[10px] text-red-400 px-1">{financialErrors.pique}</p>}
                </div>

                {/* Chip denominations */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                    Fichas habilitadas
                    <span className="text-slate-600 ml-2">({enabledChipCount}/{CHIP_DENOMS.length})</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CHIP_DENOMS.map((chip) => {
                      const isDisabled = formData.disabled_chips.includes(chip.value);
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => toggleChip(chip.value)}
                          disabled={!isDisabled && enabledChipCount <= 1}
                          className={`py-3 rounded-xl text-sm font-black transition-all border ${
                            isDisabled
                              ? "bg-slate-950 text-slate-600 border-white/5 line-through"
                              : "bg-amber-600/20 text-amber-300 border-amber-500/30 shadow-inner"
                          } ${!isDisabled && enabledChipCount <= 1 ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"}`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                  {enabledChipCount <= 1 && (
                    <p className="text-[10px] text-amber-400 px-1">Debe haber al menos 1 ficha habilitada.</p>
                  )}
                </div>
            </>
            )}

            {submitError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">{submitError}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                isCommon ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20"
              } text-white font-black py-4 rounded-[1.5rem] transition-all shadow-xl hover:shadow-lg active:scale-[0.98] disabled:opacity-50 mt-2 uppercase tracking-[0.2em] text-sm`}
            >
              {loading ? "PROCESANDO..." : "CONFIRMAR CREACIÓN"}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
