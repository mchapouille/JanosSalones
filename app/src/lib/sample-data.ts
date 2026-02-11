// Sample data for development when DB is not connected
// This mirrors the salones_integral view structure

import { assignTier, calcPerformance, calcBenchmark, calcEfficiency, calcContractDeviation, type PerformanceResult, type BenchmarkResult, type EfficiencyResult, type ContractAuditResult } from "./calculations";

export interface SalonIntegral {
    id_salon: number;
    year: number; // Added for temporal filtering
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

const BASE_SALONES = [
    { id_salon: 1, nombre_salon: "Sans Souci", estado_salon: "ACTIVO", direccion_salon: "Av. Martín Irigoyen 560", cp_salon: "1856", municipio_salon: "Sans Souci", lat_salon: -34.7753, lon_salon: -58.3561, pax_calculado: 800, pax_formal_pista: 650, pax_informal_pista: 800, pax_informal_auditorio: 500, mt2_salon: 1200 },
    { id_salon: 2, nombre_salon: "Costanera", estado_salon: "ACTIVO", direccion_salon: "Av. Costanera Sur 1100", cp_salon: "1107", municipio_salon: "CABA", lat_salon: -34.6180, lon_salon: -58.3656, pax_calculado: 600, pax_formal_pista: 500, pax_informal_pista: 600, pax_informal_auditorio: 350, mt2_salon: 900 },
    { id_salon: 3, nombre_salon: "Palermo Soho", estado_salon: "ACTIVO", direccion_salon: "Honduras 4925", cp_salon: "1414", municipio_salon: "Palermo", lat_salon: -34.5870, lon_salon: -58.4300, pax_calculado: 350, pax_formal_pista: 280, pax_informal_pista: 350, pax_informal_auditorio: 200, mt2_salon: 450 },
    { id_salon: 4, nombre_salon: "Belgrano Events", estado_salon: "ACTIVO", direccion_salon: "Cabildo 2040", cp_salon: "1426", municipio_salon: "Belgrano", lat_salon: -34.5590, lon_salon: -58.4560, pax_calculado: 300, pax_formal_pista: 240, pax_informal_pista: 300, pax_informal_auditorio: 180, mt2_salon: 380 },
    { id_salon: 5, nombre_salon: "Canning Grand", estado_salon: "ACTIVO", direccion_salon: "Ruta 52 Km 3.5", cp_salon: "1804", municipio_salon: "Canning", lat_salon: -34.8620, lon_salon: -58.5030, pax_calculado: 500, pax_formal_pista: 400, pax_informal_pista: 500, pax_informal_auditorio: 280, mt2_salon: 700 },
    { id_salon: 6, nombre_salon: "Hudson Palace", estado_salon: "ACTIVO", direccion_salon: "Camino Gral. Belgrano 4200", cp_salon: "1885", municipio_salon: "Hudson", lat_salon: -34.7910, lon_salon: -58.1550, pax_calculado: 400, pax_formal_pista: 320, pax_informal_pista: 400, pax_informal_auditorio: 220, mt2_salon: 550 },
    { id_salon: 7, nombre_salon: "Ramos Mejía Centro", estado_salon: "ACTIVO", direccion_salon: "Av. de Mayo 1250", cp_salon: "1704", municipio_salon: "Ramos Mejía", lat_salon: -34.6510, lon_salon: -58.5660, pax_calculado: 250, pax_formal_pista: 200, pax_informal_pista: 250, pax_informal_auditorio: 150, mt2_salon: 320 },
    { id_salon: 8, nombre_salon: "La Plata Eventos", estado_salon: "ACTIVO", direccion_salon: "Calle 7 N° 1356", cp_salon: "1900", municipio_salon: "La Plata", lat_salon: -34.9215, lon_salon: -57.9545, pax_calculado: 280, pax_formal_pista: 220, pax_informal_pista: 280, pax_informal_auditorio: 160, mt2_salon: 360 },
    { id_salon: 9, nombre_salon: "Villa Luzuriaga Fiestas", estado_salon: "ACTIVO", direccion_salon: "Av. Rivadavia 12850", cp_salon: "1753", municipio_salon: "Villa Luzuriaga", lat_salon: -34.6680, lon_salon: -58.5890, pax_calculado: 200, pax_formal_pista: 160, pax_informal_pista: 200, pax_informal_auditorio: 120, mt2_salon: 280 },
    { id_salon: 10, nombre_salon: "Merlo Social", estado_salon: "ACTIVO", direccion_salon: "Av. Del Sol 340", cp_salon: "1722", municipio_salon: "Merlo", lat_salon: -34.6810, lon_salon: -58.7280, pax_calculado: 180, pax_formal_pista: 140, pax_informal_pista: 180, pax_informal_auditorio: 100, mt2_salon: 250 },
    { id_salon: 11, nombre_salon: "Pilar Premium", estado_salon: "ACTIVO", direccion_salon: "Panamericana Km 52", cp_salon: "1629", municipio_salon: "Pilar", lat_salon: -34.4590, lon_salon: -58.9140, pax_calculado: 450, pax_formal_pista: 360, pax_informal_pista: 450, pax_informal_auditorio: 250, mt2_salon: 620 },
    { id_salon: 12, nombre_salon: "Caballito Center", estado_salon: "DEVUELTOS", direccion_salon: "Av. Rivadavia 5200", cp_salon: "1424", municipio_salon: "Caballito", lat_salon: -34.6180, lon_salon: -58.4380, pax_calculado: 320, pax_formal_pista: 260, pax_informal_pista: 320, pax_informal_auditorio: 190, mt2_salon: 420 },
];

const YEARS = [2024, 2025, 2026];

export const SAMPLE_SALONES: SalonIntegral[] = YEARS.flatMap((year) =>
    BASE_SALONES.map((base) => {
        const yearFactor = 1 + (year - 2024) * 0.15; // 15% annual growth
        const salonFactor = 1 + (base.id_salon % 5) / 10; // Variación por salón

        const ventasBase = (20000000 + base.id_salon * 5000000) * yearFactor * salonFactor;
        const costosFijosBase = (4000000 + base.id_salon * 500000) * yearFactor;
        const costosVariablesBase = ventasBase * 0.2; // 20% variabilidad constant

        const eventsBase = Math.floor((20 + base.id_salon) * yearFactor);
        const invitadosBase = eventsBase * 150;

        const tier = assignTier(base.municipio_salon, base.nombre_salon);

        // Final calculations for computed fields
        const performance = base.estado_salon === "ACTIVO" ? calcPerformance(costosFijosBase, ventasBase, costosVariablesBase) : null;
        const benchmark = calcBenchmark(costosFijosBase, base.mt2_salon || 0, tier);
        const efficiency = calcEfficiency(costosFijosBase, base.pax_calculado || 0, base.mt2_salon || 0, tier);
        const contractAudit = calcContractDeviation(costosFijosBase / 1470 * (1 + (base.id_salon % 10) / 100), costosFijosBase);

        return {
            ...base,
            year,
            ventas_totales_salon: base.estado_salon === "ACTIVO" ? ventasBase : 0,
            costos_fijos_salon: costosFijosBase,
            costos_variables_salon: base.estado_salon === "ACTIVO" ? costosVariablesBase : 0,
            cantidad_eventos_salon: base.estado_salon === "ACTIVO" ? eventsBase : 0,
            total_invitados_salon: base.estado_salon === "ACTIVO" ? invitadosBase : 0,
            rentabilidad_salon: performance ? (performance.marginContribution / ventasBase) * 100 : 0,
            tier,
            performance,
            benchmark,
            efficiency,
            contractAudit,
        };
    })
);

export function getSalonesData(year?: number | null): SalonIntegral[] {
    if (year !== undefined && year !== null) {
        return SAMPLE_SALONES.filter(s => s.year === year);
    }
    return SAMPLE_SALONES;
}
