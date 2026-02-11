// ============================================================
// Serendip.IA — Business Logic: The 4 Semaphores
// Based on the Audit Report for Jano's Eventos
// ============================================================

// USD → ARS conversion rate (projected Feb 2026)
export const USD_ARS_RATE = 1470;

// ---- TIER DEFINITIONS ----
// Based on the audit report segmentation
export const TIER_DEFINITIONS: Record<number, { name: string; description: string; examples: string[] }> = {
    1: { name: "Exclusivos / Shopping", description: "Salones de alto perfil y locales en Shoppings", examples: ["Sans Souci", "Costanera", "Alto Avellaneda", "DOT"] },
    2: { name: "Premium", description: "Ubicaciones de alta demanda en CABA y Corredor Norte", examples: ["Palermo", "Belgrano", "Pilar"] },
    3: { name: "Media-Alta", description: "Polos de crecimiento con valores en ascenso", examples: ["Canning", "Hudson", "Caballito"] },
    4: { name: "Media", description: "Zonas consolidadas con precios estandarizados", examples: ["Ramos Mejía", "San Martín", "La Plata"] },
    5: { name: "Base", description: "Unidades operativas con menores costos fijos", examples: ["Villa Luzuriaga", "Merlo"] },
};

// ---- BENCHMARKING DATA (from audit report) ----
// Zonaprop/Argenprop market reference data per Tier
export const BENCHMARK_DATA: Record<number, { promedioReal: number; promedioMercado: number; desvio: number; estado: string }> = {
    2: { promedioReal: 21137, promedioMercado: 25531, desvio: -17.2, estado: "Eficiente" },
    3: { promedioReal: 37415, promedioMercado: 18972, desvio: 97.2, estado: "Analizar" },
    4: { promedioReal: 19329, promedioMercado: 8990, desvio: 115.0, estado: "Analizar" },
    5: { promedioReal: 13224, promedioMercado: 2960, desvio: 346.8, estado: "Analizar" },
};

// ---- SEMAPHORE 1: PERFORMANCE (Monthly Profitability) ----

export interface PerformanceResult {
    rentIncidence: number;       // (costos_fijos / ventas_totales) * 100
    multiplier: number;          // ventas_totales / costos_fijos
    marginContribution: number;  // ventas - costos_fijos - costos_variables
    color: "green" | "yellow" | "red" | "critical";
    classification: "alta_eficiencia" | "normal" | "riesgo" | "riesgo_critico";
}

export function calcPerformance(
    costosFijos: number,
    ventasTotales: number,
    costosVariables: number
): PerformanceResult {
    if (ventasTotales === 0) {
        return { rentIncidence: 100, multiplier: 0, marginContribution: -costosFijos, color: "critical", classification: "riesgo_critico" };
    }

    const rentIncidence = (costosFijos / ventasTotales) * 100;
    const multiplier = ventasTotales / costosFijos;
    const marginContribution = ventasTotales - costosFijos - costosVariables;

    let color: PerformanceResult["color"];
    let classification: PerformanceResult["classification"];

    if (rentIncidence < 15) {
        color = "green";
        classification = "alta_eficiencia";
    } else if (rentIncidence <= 25) {
        color = "yellow";
        classification = "normal";
    } else if (rentIncidence <= 35) {
        color = "red";
        classification = "riesgo";
    } else {
        color = "critical";
        classification = "riesgo_critico";
    }

    return { rentIncidence, multiplier, marginContribution, color, classification };
}

// ---- SEMAPHORE 2: BENCHMARKING ----

export interface BenchmarkResult {
    costPerMt2: number;
    marketCostPerMt2: number;
    deviation: number;  // percentage
    color: "green" | "yellow" | "red";
}

export function calcBenchmark(
    costosFijos: number,
    mt2: number,
    tier: number
): BenchmarkResult | null {
    if (!BENCHMARK_DATA[tier] || mt2 === 0) return null;

    const costPerMt2 = costosFijos / mt2;
    const marketCostPerMt2 = BENCHMARK_DATA[tier].promedioMercado;
    const deviation = ((costPerMt2 - marketCostPerMt2) / marketCostPerMt2) * 100;

    let color: BenchmarkResult["color"];
    if (deviation <= 0) {
        color = "green";
    } else if (deviation <= 50) {
        color = "yellow";
    } else {
        color = "red";
    }

    return { costPerMt2, marketCostPerMt2, deviation, color };
}

// ---- SEMAPHORE 3: ASSET EFFICIENCY (Global Index) ----

export interface EfficiencyResult {
    paxRatio: number;
    mt2Ratio: number;
    globalIndex: number;
    color: "green" | "yellow" | "red";
}

// Tier medians for PAX cost and m² cost (derived from audit report data)
export const TIER_MEDIANS: Record<number, { paxMedian: number; mt2Median: number }> = {
    1: { paxMedian: 15000, mt2Median: 45000 },
    2: { paxMedian: 10000, mt2Median: 25531 },
    3: { paxMedian: 7500, mt2Median: 18972 },
    4: { paxMedian: 5000, mt2Median: 8990 },
    5: { paxMedian: 3000, mt2Median: 2960 },
};

export function calcEfficiency(
    costosFijos: number,
    paxCalculado: number,
    mt2: number,
    tier: number
): EfficiencyResult | null {
    const medians = TIER_MEDIANS[tier];
    if (!medians || paxCalculado === 0 || mt2 === 0) return null;

    const costPerPax = costosFijos / paxCalculado;
    const costPerMt2 = costosFijos / mt2;

    const paxRatio = costPerPax / medians.paxMedian;
    const mt2Ratio = costPerMt2 / medians.mt2Median;
    const globalIndex = (paxRatio + mt2Ratio) / 2;

    let color: EfficiencyResult["color"];
    if (globalIndex < 1.0) {
        color = "green";
    } else if (globalIndex <= 1.25) {
        color = "yellow";
    } else {
        color = "red";
    }

    return { paxRatio, mt2Ratio, globalIndex, color };
}

// ---- SEMAPHORE 4: CONTRACT AUDIT ----

export interface ContractAuditResult {
    contractAmount: number;
    realPayment: number;
    deviation: number;
    deviationPercent: number;
    color: "green" | "yellow" | "red";
}

export function calcContractDeviation(
    contractAmountUSD: number,
    realPaymentARS: number,
    conversionRate: number = USD_ARS_RATE
): ContractAuditResult {
    const contractAmount = contractAmountUSD * conversionRate;
    const deviation = realPaymentARS - contractAmount;
    const deviationPercent = contractAmount > 0 ? (deviation / contractAmount) * 100 : 0;

    let color: ContractAuditResult["color"];
    if (Math.abs(deviationPercent) <= 5) {
        color = "green";
    } else if (Math.abs(deviationPercent) <= 15) {
        color = "yellow";
    } else {
        color = "red";
    }

    return { contractAmount, realPayment: realPaymentARS, deviation, deviationPercent, color };
}

// ---- WHAT-IF SIMULATOR ----

export function simulateRentReduction(
    costosFijos: number,
    ventasTotales: number,
    costosVariables: number,
    reductionPercent: number
): { newCostosFijos: number; newIncidence: number; newMargin: number; marginImprovement: number } {
    const newCostosFijos = costosFijos * (1 - reductionPercent / 100);
    const newIncidence = ventasTotales > 0 ? (newCostosFijos / ventasTotales) * 100 : 0;
    const originalMargin = ventasTotales - costosFijos - costosVariables;
    const newMargin = ventasTotales - newCostosFijos - costosVariables;
    const marginImprovement = newMargin - originalMargin;

    return { newCostosFijos, newIncidence, newMargin, marginImprovement };
}

// ---- SEMAPHORE COLOR HELPER ----

export interface GlobalStatusResult {
    color: "green" | "yellow" | "red";
    label: string;
    description: string;
}

export interface StrategicWeights {
    performance: number;
    benchmarking: number;
    efficiency: number;
    audit: number;
}

export const DEFAULT_WEIGHTS: StrategicWeights = {
    performance: 40,
    benchmarking: 25,
    efficiency: 20,
    audit: 15
};

export function calcGlobalStatus(
    performance?: PerformanceResult,
    benchmark?: BenchmarkResult | null,
    efficiency?: EfficiencyResult | null,
    audit?: ContractAuditResult,
    weights: StrategicWeights = DEFAULT_WEIGHTS
): GlobalStatusResult {
    const getColorScore = (color?: string) => {
        switch (color) {
            case "green": return 10;
            case "yellow": return 5;
            case "red": return 2;
            case "critical": return 0;
            default: return 5; // Default to neutral if unknown
        }
    };

    const scores = {
        performance: getColorScore(performance?.color),
        benchmarking: getColorScore(benchmark?.color),
        efficiency: getColorScore(efficiency?.color),
        audit: getColorScore(audit?.color)
    };

    const totalWeight = weights.performance + weights.benchmarking + weights.efficiency + weights.audit;
    if (totalWeight === 0) return { color: "yellow", label: "Sin Ponderación", description: "Asigne pesos para calcular el estatus." };

    const weightedScore = (
        (scores.performance * weights.performance) +
        (scores.benchmarking * weights.benchmarking) +
        (scores.efficiency * weights.efficiency) +
        (scores.audit * weights.audit)
    ) / totalWeight;

    // Determine Global Status based on Weighted Score
    if (weightedScore >= 8.5) {
        return {
            color: "green",
            label: "Salón Eficiente",
            description: "Operación saludable. Cumple con los estándares de rentabilidad y mercado.",
        };
    } else if (weightedScore >= 5.0) {
        return {
            color: "yellow",
            label: "Atención / Seguimiento",
            description: "Desvíos menores detectados. Monitorear evolución antes de tomar decisiones.",
        };
    } else if (weightedScore >= 2.5) {
        return {
            color: "red",
            label: "Analizar Renegociación",
            description: "Múltiples indicadores fuera de mercado. El activo es ineficiente respecto a la competencia.",
        };
    } else {
        return {
            color: "red",
            label: "Acción Urgente",
            description: "Rentabilidad comprometida. Requiere renegociación inmediata o revisión de costos.",
        };
    }
}

export function getSemaphoreColor(color: string): string {
    switch (color) {
        case "green": return "#22c55e";
        case "yellow": return "#eab308";
        case "red": return "#ef4444";
        case "critical": return "#991b1b";
        default: return "#6b7280";
    }
}

// ---- TIER ASSIGNMENT (based on municipio) ----

const TIER_MAP: Record<string, number> = {
    // Tier 1
    "sans souci": 1, "costanera": 1, "alto avellaneda": 1, "dot": 1,
    // Tier 2
    "palermo": 2, "belgrano": 2, "pilar": 2, "recoleta": 2, "nuñez": 2,
    // Tier 3
    "canning": 3, "hudson": 3, "caballito": 3, "esteban echeverria": 3,
    // Tier 4
    "ramos mejia": 4, "san martin": 4, "la plata": 4, "avellaneda": 4, "lanus": 4,
    // Tier 5
    "villa luzuriaga": 5, "merlo": 5, "moreno": 5, "gonzalez catan": 5,
};

export function assignTier(municipio: string | null, nombreSalon: string): number {
    // First check by salon name for Tier 1 special cases
    const normalizedName = nombreSalon.toLowerCase();
    for (const [key, tier] of Object.entries(TIER_MAP)) {
        if (normalizedName.includes(key) && tier === 1) return 1;
    }

    // Then check by municipio
    if (municipio) {
        const normalizedMunicipio = municipio.toLowerCase().trim();
        for (const [key, tier] of Object.entries(TIER_MAP)) {
            if (normalizedMunicipio.includes(key)) return tier;
        }
    }

    return 4; // Default to Tier 4 (Media)
}
