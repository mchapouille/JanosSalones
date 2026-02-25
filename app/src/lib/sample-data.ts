// Data service for Dashboard - Connects to processed Excel data
import { assignTier, getSemaphoreColor, type PerformanceResult } from "./calculations";
import rawSalonesData from './salones_data.json';

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
    costos_totales_salon: number | null;
    ventas_totales_salon: number | null;
    rentabilidad_salon: number | null;

    // Direct from backend UI mapping
    retorno_sobre_alquiler: number | null;
    incidencia_alquiler_sobre_facturacion_anual: number | null;
    participacion_margen: number | null;
    ip_score: number | null;
    categoria_ip: string | null;
    indice_global_desviacion_mediana: number | null;
    semaforo_indice_global: string | null;
    venta_mensual_promedio_meses_activo: number | null;
    margen_individual: number | null;
    ticket_evento_promedio: number | null;
    ticket_persona_promedio: number | null;

    tier: number;

    // Legacy or calculated objects
    performance?: any;
    efficiency?: any;
    benchmark?: any;
    contractAudit?: any;
    extra?: any;
}

/** Shared raw→SalonIntegral mapping (used by static getSalonesData and runtime /api/salones) */
export function mapRawToSalon(row: any): SalonIntegral {
    return {
        ...row,
        retorno_sobre_alquiler: row.retorno_sobre_alquiler ?? row.performance?.multiplier ?? 0,
        incidencia_alquiler_sobre_facturacion_anual: row.incidencia_alquiler_sobre_facturacion_anual ?? row.performance?.rentIncidence ?? 0,
        participacion_margen: row.participacion_margen ?? row.performance?.marginContribution ?? 0,
        ip_score: row.ip_score ?? row.performance?.score ?? 0,
        categoria_ip: row.categoria_ip ?? row.performance?.color ?? "gray",
        indice_global_desviacion_mediana: row.indice_global_desviacion_mediana ?? row.efficiency?.globalIndex ?? 0,
        semaforo_indice_global: row.semaforo_indice_global ?? (row.efficiency?.color === 'red' || row.efficiency?.color === 'yellow' ? 'REVISAR' : 'ESTANDAR'),
        venta_mensual_promedio_meses_activo: row.venta_mensual_promedio_meses_activo ?? row.extra?.venta_mensual ?? (row.ventas_totales_salon / 12),
        margen_individual: row.margen_individual ?? (row.ventas_totales_salon - (row.costos_variables_salon || 0) - ((row.costos_fijos_salon || 0) * 12)),
        ticket_evento_promedio: row.ticket_evento_promedio ?? row.extra?.ticket_evento ?? 0,
        ticket_persona_promedio: row.ticket_persona_promedio ?? row.extra?.ticket_persona ?? 0,
    } as SalonIntegral;
}

/** Static build-time data (used locally and as fallback) */
export function getSalonesData(): SalonIntegral[] {
    return (rawSalonesData as any[]).map(mapRawToSalon);
}

