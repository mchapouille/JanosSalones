"use client";

import type { SalonIntegral } from "@/lib/sample-data";

interface SalonSelectorProps {
    value: number | null;
    onChange: (id: number | null) => void;
    salones: SalonIntegral[];
    label?: string;
}

export function SalonSelector({
    value,
    onChange,
    salones,
    label = "Seleccionar de lista",
}: SalonSelectorProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-1">
                {label}
            </label>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[260px] font-bold"
            >
                <option value="">Buscar Salón...</option>
                {[...salones]
                    .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon))
                    .map(s => (
                        <option key={s.id_salon} value={s.id_salon}>
                            {s.nombre_salon} ({s.id_salon})
                        </option>
                    ))}
            </select>
        </div>
    );
}