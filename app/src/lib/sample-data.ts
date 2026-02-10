// Sample data for development when DB is not connected
// This mirrors the salones_integral view structure

import { assignTier, calcPerformance, calcBenchmark, calcEfficiency } from "./calculations";

export interface SalonIntegral {
    id_salon: number;
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
    performance: ReturnType<typeof calcPerformance> | null;
    benchmark: ReturnType<typeof calcBenchmark> | null;
    efficiency: ReturnType<typeof calcEfficiency> | null;
}

export const SAMPLE_SALONES: SalonIntegral[] = [
    {
        id_salon: 1, nombre_salon: "Sans Souci", estado_salon: "ACTIVO",
        direccion_salon: "Av. Martín Irigoyen 560", cp_salon: "1856", municipio_salon: "Sans Souci",
        lat_salon: -34.7753, lon_salon: -58.3561,
        pax_calculado: 800, pax_formal_pista: 650, pax_informal_pista: 800, pax_informal_auditorio: 500,
        mt2_salon: 1200, cantidad_eventos_salon: 48, total_invitados_salon: 38400,
        costos_variables_salon: 15000000, costos_fijos_salon: 8500000, ventas_totales_salon: 85000000,
        rentabilidad_salon: 72.35,
        tier: 1, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 2, nombre_salon: "Costanera", estado_salon: "ACTIVO",
        direccion_salon: "Av. Costanera Sur 1100", cp_salon: "1107", municipio_salon: "CABA",
        lat_salon: -34.6180, lon_salon: -58.3656,
        pax_calculado: 600, pax_formal_pista: 500, pax_informal_pista: 600, pax_informal_auditorio: 350,
        mt2_salon: 900, cantidad_eventos_salon: 40, total_invitados_salon: 24000,
        costos_variables_salon: 12000000, costos_fijos_salon: 9200000, ventas_totales_salon: 72000000,
        rentabilidad_salon: 70.56,
        tier: 1, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 3, nombre_salon: "Palermo Soho", estado_salon: "ACTIVO",
        direccion_salon: "Honduras 4925", cp_salon: "1414", municipio_salon: "Palermo",
        lat_salon: -34.5870, lon_salon: -58.4300,
        pax_calculado: 350, pax_formal_pista: 280, pax_informal_pista: 350, pax_informal_auditorio: 200,
        mt2_salon: 450, cantidad_eventos_salon: 36, total_invitados_salon: 12600,
        costos_variables_salon: 8000000, costos_fijos_salon: 5800000, ventas_totales_salon: 42000000,
        rentabilidad_salon: 67.14,
        tier: 2, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 4, nombre_salon: "Belgrano Events", estado_salon: "ACTIVO",
        direccion_salon: "Cabildo 2040", cp_salon: "1426", municipio_salon: "Belgrano",
        lat_salon: -34.5590, lon_salon: -58.4560,
        pax_calculado: 300, pax_formal_pista: 240, pax_informal_pista: 300, pax_informal_auditorio: 180,
        mt2_salon: 380, cantidad_eventos_salon: 32, total_invitados_salon: 9600,
        costos_variables_salon: 7500000, costos_fijos_salon: 5200000, ventas_totales_salon: 35000000,
        rentabilidad_salon: 63.71,
        tier: 2, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 5, nombre_salon: "Canning Grand", estado_salon: "ACTIVO",
        direccion_salon: "Ruta 52 Km 3.5", cp_salon: "1804", municipio_salon: "Canning",
        lat_salon: -34.8620, lon_salon: -58.5030,
        pax_calculado: 500, pax_formal_pista: 400, pax_informal_pista: 500, pax_informal_auditorio: 280,
        mt2_salon: 700, cantidad_eventos_salon: 28, total_invitados_salon: 14000,
        costos_variables_salon: 9000000, costos_fijos_salon: 7200000, ventas_totales_salon: 38000000,
        rentabilidad_salon: 57.37,
        tier: 3, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 6, nombre_salon: "Hudson Palace", estado_salon: "ACTIVO",
        direccion_salon: "Camino Gral. Belgrano 4200", cp_salon: "1885", municipio_salon: "Hudson",
        lat_salon: -34.7910, lon_salon: -58.1550,
        pax_calculado: 400, pax_formal_pista: 320, pax_informal_pista: 400, pax_informal_auditorio: 220,
        mt2_salon: 550, cantidad_eventos_salon: 24, total_invitados_salon: 9600,
        costos_variables_salon: 6500000, costos_fijos_salon: 6800000, ventas_totales_salon: 28000000,
        rentabilidad_salon: 52.50,
        tier: 3, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 7, nombre_salon: "Ramos Mejía Centro", estado_salon: "ACTIVO",
        direccion_salon: "Av. de Mayo 1250", cp_salon: "1704", municipio_salon: "Ramos Mejía",
        lat_salon: -34.6510, lon_salon: -58.5660,
        pax_calculado: 250, pax_formal_pista: 200, pax_informal_pista: 250, pax_informal_auditorio: 150,
        mt2_salon: 320, cantidad_eventos_salon: 20, total_invitados_salon: 5000,
        costos_variables_salon: 4200000, costos_fijos_salon: 4500000, ventas_totales_salon: 18000000,
        rentabilidad_salon: 51.67,
        tier: 4, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 8, nombre_salon: "La Plata Eventos", estado_salon: "ACTIVO",
        direccion_salon: "Calle 7 N° 1356", cp_salon: "1900", municipio_salon: "La Plata",
        lat_salon: -34.9215, lon_salon: -57.9545,
        pax_calculado: 280, pax_formal_pista: 220, pax_informal_pista: 280, pax_informal_auditorio: 160,
        mt2_salon: 360, cantidad_eventos_salon: 22, total_invitados_salon: 6160,
        costos_variables_salon: 5000000, costos_fijos_salon: 5100000, ventas_totales_salon: 20000000,
        rentabilidad_salon: 49.50,
        tier: 4, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 9, nombre_salon: "Villa Luzuriaga Fiestas", estado_salon: "ACTIVO",
        direccion_salon: "Av. Rivadavia 12850", cp_salon: "1753", municipio_salon: "Villa Luzuriaga",
        lat_salon: -34.6680, lon_salon: -58.5890,
        pax_calculado: 200, pax_formal_pista: 160, pax_informal_pista: 200, pax_informal_auditorio: 120,
        mt2_salon: 280, cantidad_eventos_salon: 16, total_invitados_salon: 3200,
        costos_variables_salon: 3000000, costos_fijos_salon: 3200000, ventas_totales_salon: 10500000,
        rentabilidad_salon: 40.95,
        tier: 5, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 10, nombre_salon: "Merlo Social", estado_salon: "ACTIVO",
        direccion_salon: "Av. Del Sol 340", cp_salon: "1722", municipio_salon: "Merlo",
        lat_salon: -34.6810, lon_salon: -58.7280,
        pax_calculado: 180, pax_formal_pista: 140, pax_informal_pista: 180, pax_informal_auditorio: 100,
        mt2_salon: 250, cantidad_eventos_salon: 14, total_invitados_salon: 2520,
        costos_variables_salon: 2800000, costos_fijos_salon: 2900000, ventas_totales_salon: 8000000,
        rentabilidad_salon: 28.75,
        tier: 5, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 11, nombre_salon: "Pilar Premium", estado_salon: "ACTIVO",
        direccion_salon: "Panamericana Km 52", cp_salon: "1629", municipio_salon: "Pilar",
        lat_salon: -34.4590, lon_salon: -58.9140,
        pax_calculado: 450, pax_formal_pista: 360, pax_informal_pista: 450, pax_informal_auditorio: 250,
        mt2_salon: 620, cantidad_eventos_salon: 30, total_invitados_salon: 13500,
        costos_variables_salon: 8500000, costos_fijos_salon: 6000000, ventas_totales_salon: 45000000,
        rentabilidad_salon: 67.78,
        tier: 2, performance: null, benchmark: null, efficiency: null,
    },
    {
        id_salon: 12, nombre_salon: "Caballito Center", estado_salon: "OBRA",
        direccion_salon: "Av. Rivadavia 5200", cp_salon: "1424", municipio_salon: "Caballito",
        lat_salon: -34.6180, lon_salon: -58.4380,
        pax_calculado: 320, pax_formal_pista: 260, pax_informal_pista: 320, pax_informal_auditorio: 190,
        mt2_salon: 420, cantidad_eventos_salon: 0, total_invitados_salon: 0,
        costos_variables_salon: 0, costos_fijos_salon: 5500000, ventas_totales_salon: 0,
        rentabilidad_salon: 0,
        tier: 3, performance: null, benchmark: null, efficiency: null,
    },
].map((salon) => {
    const costosFijos = salon.costos_fijos_salon || 0;
    const ventasTotales = salon.ventas_totales_salon || 0;
    const costosVariables = salon.costos_variables_salon || 0;
    const pax = salon.pax_calculado || 0;
    const mt2 = salon.mt2_salon || 0;

    return {
        ...salon,
        performance: ventasTotales > 0 ? calcPerformance(costosFijos, ventasTotales, costosVariables) : null,
        benchmark: calcBenchmark(costosFijos, mt2, salon.tier),
        efficiency: calcEfficiency(costosFijos, pax, mt2, salon.tier),
    };
});

export function getSalonesData(): SalonIntegral[] {
    return SAMPLE_SALONES;
}
