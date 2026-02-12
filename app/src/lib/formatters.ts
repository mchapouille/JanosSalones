export function formatARS(value: any): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return "S/D";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
    }).format(num);
}

export function formatUSD(value: any): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return "S/D";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
    }).format(num);
}

export function formatPercentage(value: number, decimals: number = 1): string {
    if (isNaN(value)) return "0%";
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: any): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat("es-AR", { useGrouping: true }).format(num);
}

export function formatMultiplier(value: number): string {
    if (!isFinite(value) || isNaN(value)) return "Máximo";
    if (value > 1000) return "> 1000x";
    return `${value.toFixed(1)}x`;
}
