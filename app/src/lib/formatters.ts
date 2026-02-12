export function formatARS(value: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatUSD(value: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat("es-AR").format(value);
}

export function formatMultiplier(value: number): string {
    if (!isFinite(value) || isNaN(value)) return "Máximo";
    if (value > 1000) return "> 1000x";
    return `${value.toFixed(1)}x`;
}
