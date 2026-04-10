"use client";

import { useEffect, useMemo } from "react";
import { Star, MessageSquareText, SearchX, AlertTriangle } from "lucide-react";
import {
    MIN_REVIEW_COUNT_FOR_RANKING,
    useDashboard,
} from "@/components/DashboardContext";
import type { GoogleRating } from "@/lib/google-ratings";
import type { SalonIntegral } from "@/lib/sample-data";

interface SalonRow {
    salonId: number;
    nombreSalon: string;
    rating: number | null;
    reviewCount: number;
    googlePlaceName: string | null;
    formattedAddress: string | null;
}

function formatStars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function getRows(salones: SalonIntegral[], ratings: GoogleRating[]): SalonRow[] {
    const ratingsBySalon = new Map<number, GoogleRating>(ratings.map((entry) => [entry.salonId, entry]));

    return salones
        .map((salon) => {
            const rating = ratingsBySalon.get(salon.id_salon);

            return {
                salonId: salon.id_salon,
                nombreSalon: salon.nombre_salon,
                rating: rating?.rating ?? null,
                reviewCount: rating?.reviewCount ?? 0,
                googlePlaceName: rating?.googlePlaceName ?? null,
                formattedAddress: rating?.formattedAddress ?? null,
            };
        });
}

function compareTopRanking(a: SalonRow, b: SalonRow): number {
    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;

    if (aRating !== bRating) {
        return bRating - aRating;
    }

    if (a.reviewCount !== b.reviewCount) {
        return b.reviewCount - a.reviewCount;
    }

    return a.nombreSalon.localeCompare(b.nombreSalon, "es-AR");
}

function compareLowRanking(a: SalonRow, b: SalonRow): number {
    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;

    if (aRating !== bRating) {
        return aRating - bRating;
    }

    if (a.reviewCount !== b.reviewCount) {
        return a.reviewCount - b.reviewCount;
    }

    return a.nombreSalon.localeCompare(b.nombreSalon, "es-AR");
}

function RatingList({
    title,
    rows,
}: {
    title: string;
    rows: SalonRow[];
}) {
    const visibleRows = rows.slice(0, 5);

    return (
        <div className="rounded-xl border border-[#b8891a]/12 bg-white/70">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#b8891a]/10 bg-[#faf8f4]">
                <h3 className="text-sm font-black tracking-wide uppercase text-[#1a1208]">{title}</h3>
            </div>

            <ul className="divide-y divide-[#b8891a]/10">
                {visibleRows.map((row) => (
                    <li key={`${title}-${row.salonId}`} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-[#1a1208]">{row.nombreSalon}</p>
                                {row.googlePlaceName && row.googlePlaceName !== row.nombreSalon && (
                                    <p className="text-xs text-[#7a6d5a]">{row.googlePlaceName}</p>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-sm font-bold text-[#1a1208]">{row.rating?.toFixed(1)}</p>
                                <p className="text-xs tracking-[0.2em] text-[#b8891a]">{formatStars(row.rating as number)}</p>
                                <p className="text-xs text-[#7a6d5a] inline-flex items-center gap-1 justify-end mt-1">
                                    <MessageSquareText size={12} />
                                    {row.reviewCount}
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function GoogleRatingsPanel() {
    const { salones, ratings, ratingsLoading, ratingsError, loadGoogleRatings } = useDashboard();

    const rows = useMemo(() => getRows(salones, ratings), [salones, ratings]);

    const ratedRows = useMemo(
        () => rows.filter((row) => row.rating !== null && row.rating > 0 && row.reviewCount >= MIN_REVIEW_COUNT_FOR_RANKING),
        [rows]
    );

    const topRows = useMemo(() => [...ratedRows].sort(compareTopRanking), [ratedRows]);
    const lowRows = useMemo(() => [...ratedRows].sort(compareLowRanking), [ratedRows]);
    const noPresenceRows = useMemo(
        () => rows.filter((row) => row.rating === null),
        [rows]
    );

    useEffect(() => {
        void loadGoogleRatings();
    }, [loadGoogleRatings]);

    return (
        <section className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7a1515]/3 via-transparent to-[#b8891a]/4 rounded-2xl border border-[#b8891a]/12 shadow-sm" />
            <div className="glass-card p-6 md:p-8 relative">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#b8891a]/10">
                    <div className="w-8 h-8 rounded-lg bg-[#7a1515]/10 flex items-center justify-center">
                        <Star size={18} className="text-[#b8891a]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#1a1208] tracking-wider font-display">Reputación en Google</h2>
                        <p className="text-xs text-[#7a6d5a] uppercase font-bold tracking-wide">
                            Top 5 / Low 5 · orden directo por calificación
                        </p>
                        <p className="text-xs text-[#7a6d5a] font-medium mt-1">
                            Solo salones con mínimo 10 comentarios
                        </p>
                    </div>
                </div>

                {ratingsLoading ? (
                    <div className="flex items-center gap-3 text-sm text-[#7a6d5a]">
                        <div className="w-4 h-4 rounded-full border-2 border-[#b8891a]/30 border-t-[#b8891a] animate-spin" />
                        Cargando reputación de salones...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ratingsError && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-700" />
                                <span className="text-sm text-amber-700 font-medium">{ratingsError}</span>
                            </div>
                        )}

                        {rows.length > 0 ? (
                            <div className="space-y-4">
                                {ratedRows.length > 0 ? (
                                    <>
                                        <RatingList
                                            title="Top 5"
                                            rows={topRows}
                                        />

                                        <RatingList
                                            title="Low 5"
                                            rows={lowRows}
                                        />
                                    </>
                                ) : (
                                    <div className="p-4 rounded-xl border border-dashed border-[#b8891a]/25 text-sm text-[#7a6d5a] bg-[#faf8f4]">
                                        No se encontraron salones con rating en Google por ahora.
                                    </div>
                                )}

                                <div className="rounded-xl border border-dashed border-[#b8891a]/30 bg-[#faf8f4] px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-[#7a6d5a] mb-2">
                                        <SearchX size={14} />
                                        <span className="font-semibold">Sin presencia en Google: {noPresenceRows.length}</span>
                                    </div>

                                    {noPresenceRows.length > 0 ? (
                                        <p className="text-xs text-[#7a6d5a] leading-relaxed">
                                            {noPresenceRows.map((row) => row.nombreSalon).join(" · ")}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-[#7a6d5a]">Todos los salones tienen rating reportado.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed border-[#b8891a]/25 text-sm text-[#7a6d5a] bg-[#faf8f4]">
                                No hay reputación disponible para salones en este momento.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
