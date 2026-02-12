// Data service for Dashboard - Connects to processed Excel data
import { assignTier, calcPerformance, calcBenchmark, calcEfficiency, calcContractDeviation, type PerformanceResult, type BenchmarkResult, type EfficiencyResult, type ContractAuditResult } from "./calculations";
import rawSalonesData from "./salones_data.json";

export interface SalonIntegral {
    id_salon: number;
    year: number;
    nombre_salon: string;
    estado_salon: string;
    direccion_salon: string | null;
    cp_salon: string | null;
    municipio_salon: string | null;
    lat_salon: number | null;
    lon_salon: number | null;
    pax_calculado: number | null;
    pax_formal_pista: number | null;
    pax_informal_pista: number | null;
    pax_informal_auditorio: number | null;
    mt2_salon: number | null;
    cantidad_eventos_salon: number | null;
    total_invitados_salon: number | null;
    costos_variables_salon: number | null;
    costos_fijos_salon: number | null;
    ventas_totales_salon: number | null;
    rentabilidad_salon: number | null;
    // Computed fields
    tier: number;
    performance: PerformanceResult | null;
    benchmark: BenchmarkResult | null;
    efficiency: EfficiencyResult | null;
    contractAudit: ContractAuditResult | null;
}

// Map the JSON data to the SalonIntegral interface, ensuring all dynamic calculations are consistent
export const SAMPLE_SALONES: SalonIntegral[] = (rawSalonesData as any[]).map((row) => {
    const tier = row.tier || assignTier(row.municipio_salon, row.nombre_salon);

    // Re-run the actual logic calculations to ensure UI consistency with current formulas
    // but preserving the values from Excel if they are primary inputs
    const performance = row.estado_salon === "ACTIVO"
        ? calcPerformance(row.costos_fijos_salon, row.ventas_totales_salon, row.costos_variables_salon)
        : null;

    const benchmark = calcBenchmark(row.costos_fijos_salon, row.mt2_salon || 0, tier);
    const efficiency = calcEfficiency(row.costos_fijos_salon, row.pax_calculado || 0, row.mt2_salon || 0, tier);

    // For Audit, we don't have the contract USD in excel explicitly yet, 
    // but the Excel suggests they are calculated. For now, we'll keep it simple or use defaults.
    const contractAudit = calcContractDeviation(row.costos_fijos_salon / 1470, row.costos_fijos_salon);

    return {
        ...row,
        tier,
        performance,
        benchmark,
        efficiency,
        contractAudit,
    } as SalonIntegral;
});

export function getSalonesData(year?: number | null): SalonIntegral[] {
    // Current Excel data is for one year (2024 by default in script)
    // If we need other years, we can simulate them here or expand the ingestion
    if (year !== undefined && year !== null) {
        return SAMPLE_SALONES.filter(s => s.year === year);
    }
    return SAMPLE_SALONES;
}
