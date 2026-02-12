// Data service for Dashboard - Connects to processed Excel data
import { assignTier, getSemaphoreColor, type PerformanceResult, type BenchmarkResult, type EfficiencyResult, type ContractAuditResult } from "./calculations";
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
    extra?: {
        meses_activos: number;
        ticket_evento: number;
        ticket_persona: number;
        venta_mensual: number;
    }
}

// Map the JSON data to the SalonIntegral interface
export const SAMPLE_SALONES: SalonIntegral[] = (rawSalonesData as any[]).map((row) => {
    // We trust the JSON calculations from ingest-data.py (which come from Excel)
    return {
        ...row,
        // Ensure tier is at least 1 for display logic
        tier: row.tier || assignTier(row.municipio_salon, row.nombre_salon) || 5,
    } as SalonIntegral;
});

export function getSalonesData(year?: number | null): SalonIntegral[] {
    if (year !== undefined && year !== null) {
        return SAMPLE_SALONES.filter(s => s.year === year);
    }
    return SAMPLE_SALONES;
}
