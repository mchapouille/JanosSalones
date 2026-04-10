import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import salonesData from "@/lib/salones_data.json";
import type {
    GoogleRating,
    GoogleRatingsApiResponse,
    GoogleRatingsErrorResponse,
    GoogleRatingsFailureType,
    GoogleRatingsSource,
} from "@/lib/google-ratings";

interface PlaceSearchRequest {
    textQuery: string;
    maxResultCount: number;
    locationBias?: {
        circle: {
            center: {
                latitude: number;
                longitude: number;
            };
            radius: number;
        };
    };
}

interface PlaceSearchAttempt {
    label: string;
    textQuery: string;
    applyLocationBias: boolean;
}

interface PlaceSearchAttemptResult {
    label: string;
    textQuery: string;
    status: number;
    found: boolean;
    candidateName: string | null;
    candidateAddress: string | null;
    googleError: string | null;
}

interface GoogleRatingDebug {
    attempts: PlaceSearchAttemptResult[];
}

interface GoogleRatingsDiagnosticFailure {
    salonId: number;
    nombreSalon: string;
    direccionSalon: string | null;
    municipioSalon: string | null;
    failedReason: "rate-limit" | "upstream-error" | "no-match" | "missing-key";
    attempts: PlaceSearchAttemptResult[];
}

interface GoogleRatingsDiagnosticResponse {
    diagnostic: true;
    totalSalones: number;
    failedCount: number;
    failedSalones: GoogleRatingsDiagnosticFailure[];
}

type GoogleRatingWithDebug = GoogleRating & {
    debug?: GoogleRatingDebug;
};

interface PlaceSearchResponse {
    places?: Array<{
        rating?: number;
        userRatingCount?: number;
        displayName?: {
            text?: string;
        };
        formattedAddress?: string;
    }>;
}

type PlaceCandidate = NonNullable<PlaceSearchResponse["places"]>[number];

interface SalonSource {
    id_salon: number;
    nombre_salon: string;
    direccion_salon: string | null;
    cp_salon?: string | null;
    municipio_salon: string | null;
    lat_salon: number | null;
    lon_salon: number | null;
}

type ResolveFailedReason = "rate-limit" | "upstream-error" | "no-match";

interface ResolveSalonRatingResult {
    response: GoogleRatingWithDebug;
    failedReason: ResolveFailedReason | null;
    failedStatus: number | null;
}

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const COUNTRY = "Argentina";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PROVINCE_VARIATIONS = ["Buenos Aires", "GBA", "Provincia de Buenos Aires"] as const;
const UNAVAILABLE_MESSAGE = "No se pudo cargar la reputación de este salón en este momento.";

function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
    if (value === null) return null;
    if (typeof value === "number") return value;
    return value.toNumber();
}

function buildNoMatchResponse(salon: SalonSource): GoogleRating {
    return {
        salonId: salon.id_salon,
        nombreSalon: salon.nombre_salon,
        rating: null,
        reviewCount: 0,
        googlePlaceName: null,
        formattedAddress: null,
    };
}

function normalizeQuery(parts: Array<string | null | undefined>): string {
    return parts
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

function stripStreetNumber(address: string | null): string | null {
    if (!address) return null;
    const withoutNumber = address.replace(/\s+\d+[a-zA-Z]?([.,]\d+)?\s*$/u, "").trim();
    return withoutNumber.length > 0 ? withoutNumber : null;
}

function buildSearchAttempts(salon: SalonSource): PlaceSearchAttempt[] {
    const hasCoordinates = typeof salon.lat_salon === "number" && typeof salon.lon_salon === "number";
    const streetOnly = stripStreetNumber(salon.direccion_salon);

    const queries = PROVINCE_VARIATIONS.flatMap((province) => {
        const fullAddressOnly = normalizeQuery([
            salon.direccion_salon,
            salon.municipio_salon,
            province,
            COUNTRY,
        ]);

        const streetOnlyQuery = normalizeQuery([
            streetOnly,
            salon.municipio_salon,
            province,
            COUNTRY,
        ]);

        return [
            {
                label: `address-only-${province.toLowerCase().replace(/\s+/g, "-")}`,
                textQuery: fullAddressOnly,
                applyLocationBias: false,
            },
            {
                label: `street-only-${province.toLowerCase().replace(/\s+/g, "-")}`,
                textQuery: streetOnlyQuery,
                applyLocationBias: false,
            },
            {
                label: `name-address-${province.toLowerCase().replace(/\s+/g, "-")}`,
                textQuery: normalizeQuery([
                    salon.nombre_salon,
                    salon.direccion_salon,
                    salon.municipio_salon,
                    province,
                    COUNTRY,
                ]),
                applyLocationBias: false,
            },
        ];
    });

    const attempts: PlaceSearchAttempt[] = [];
    for (const query of queries) {
        if (!query.textQuery) continue;
        attempts.push(query);

        if (hasCoordinates) {
            attempts.push({
                ...query,
                label: `${query.label}-with-bias`,
                applyLocationBias: true,
            });
        }
    }

    return attempts.filter((attempt, index, all) => {
        const key = `${attempt.textQuery}-${attempt.applyLocationBias}`;
        return all.findIndex((item) => `${item.textQuery}-${item.applyLocationBias}` === key) === index;
    });
}

function logGoogleRatingsEvent(
    level: "warn" | "error",
    message: string,
    fields: {
        salonId: number;
        errorType: "rate-limit" | "missing-key" | "upstream-error" | "no-match";
        status: number | null;
        fallback: "cache-hit" | "stale-cache" | "unavailable" | "none";
        cacheAgeHours: number | null;
    }
): void {
    const payload = {
        salonId: fields.salonId,
        type: fields.errorType,
        status: fields.status,
        fallback: fields.fallback,
        cacheAgeHours: fields.cacheAgeHours,
    };

    if (level === "error") {
        console.error(`[google-ratings] ${message}`, payload);
        return;
    }

    console.warn(`[google-ratings] ${message}`, payload);
}

async function executePlaceSearch(
    attempt: PlaceSearchAttempt,
    apiKey: string,
    payload: PlaceSearchRequest
): Promise<{ result: PlaceSearchAttemptResult; place: PlaceCandidate | null }> {
    const placesResponse = await fetch(GOOGLE_PLACES_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.rating,places.userRatingCount,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    let place: PlaceCandidate | null = null;
    let googleError: string | null = null;

    if (placesResponse.ok) {
        const placesData = (await placesResponse.json()) as PlaceSearchResponse;
        place = placesData.places?.[0] ?? null;
    } else {
        googleError = `HTTP ${placesResponse.status}`;
    }

    const result: PlaceSearchAttemptResult = {
        label: attempt.label,
        textQuery: attempt.textQuery,
        status: placesResponse.status,
        found: Boolean(place),
        candidateName: place?.displayName?.text ?? null,
        candidateAddress: place?.formattedAddress ?? null,
        googleError,
    };

    return { result, place };
}

async function resolveSalonRating(salon: SalonSource, apiKey: string): Promise<ResolveSalonRatingResult> {
    const attempts = buildSearchAttempts(salon);
    const debugAttempts: PlaceSearchAttemptResult[] = [];
    let matchedPlace: PlaceCandidate | null = null;

    for (const attempt of attempts) {
        const payload: PlaceSearchRequest = {
            textQuery: attempt.textQuery,
            maxResultCount: 1,
        };

        if (attempt.applyLocationBias) {
            payload.locationBias = {
                circle: {
                    center: {
                        latitude: salon.lat_salon as number,
                        longitude: salon.lon_salon as number,
                    },
                    radius: 750,
                },
            };
        }

        const { result, place } = await executePlaceSearch(attempt, apiKey, payload);
        debugAttempts.push(result);

        if (result.status === 429) {
            return {
                response: {
                    ...buildNoMatchResponse(salon),
                    debug: { attempts: debugAttempts },
                },
                failedReason: "rate-limit",
                failedStatus: result.status,
            };
        }

        if (result.status >= 400) {
            return {
                response: {
                    ...buildNoMatchResponse(salon),
                    debug: { attempts: debugAttempts },
                },
                failedReason: "upstream-error",
                failedStatus: result.status,
            };
        }

        if (place) {
            matchedPlace = place;
            break;
        }
    }

    if (!matchedPlace) {
        return {
            response: {
                ...buildNoMatchResponse(salon),
                debug: { attempts: debugAttempts },
            },
            failedReason: "no-match",
            failedStatus: 200,
        };
    }

    const reviewCount = matchedPlace.userRatingCount ?? 0;
    const rating = typeof matchedPlace.rating === "number" && reviewCount > 0 ? matchedPlace.rating : 0;

    const responseQuery = normalizeQuery([matchedPlace.displayName?.text, matchedPlace.formattedAddress]);

    return {
        response: {
            salonId: salon.id_salon,
            nombreSalon: salon.nombre_salon,
            rating,
            reviewCount,
            googlePlaceName: matchedPlace.displayName?.text ?? null,
            formattedAddress: matchedPlace.formattedAddress ?? null,
            debug: {
                attempts: [
                    ...debugAttempts,
                    {
                        label: "resolved-displayName-formattedAddress",
                        textQuery: responseQuery,
                        status: 200,
                        found: true,
                        candidateName: matchedPlace.displayName?.text ?? null,
                        candidateAddress: matchedPlace.formattedAddress ?? null,
                        googleError: null,
                    },
                ],
            },
        },
        failedReason: null,
        failedStatus: null,
    };
}

function mapCacheToRating(salon: SalonSource, cacheEntry: {
    google_rating: Prisma.Decimal | null;
    review_count: number;
    google_place_name: string | null;
    formatted_address: string | null;
}): GoogleRating {
    return {
        salonId: salon.id_salon,
        nombreSalon: salon.nombre_salon,
        rating: decimalToNumber(cacheEntry.google_rating),
        reviewCount: cacheEntry.review_count,
        googlePlaceName: cacheEntry.google_place_name,
        formattedAddress: cacheEntry.formatted_address,
    };
}

function buildAvailableResponse(
    source: GoogleRatingsSource,
    rating: GoogleRating,
    stale: boolean
): GoogleRatingsApiResponse {
    return {
        state: "available",
        source,
        stale,
        rating,
    };
}

function buildUnavailableResponse(salonId: number, reason: GoogleRatingsFailureType): GoogleRatingsApiResponse {
    return {
        state: "unavailable",
        reason,
        message: UNAVAILABLE_MESSAGE,
        salonId,
    };
}

function getCacheAgeHours(cachedAt: Date): number {
    return Number(((Date.now() - cachedAt.getTime()) / (60 * 60 * 1000)).toFixed(2));
}

export async function GET(request: Request) {
    const unauthorized: GoogleRatingsErrorResponse = { error: "Unauthorized" };

    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json(unauthorized, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const diagnosticMode = searchParams.get("diagnostic") === "1" || searchParams.get("diagnostic") === "true";
        const salonIdParam = searchParams.get("salonId");

        if (diagnosticMode) {
            const apiKey = process.env.GOOGLE_PLACES_API_KEY;
            const diagnosticFailures: GoogleRatingsDiagnosticFailure[] = [];

            if (!apiKey) {
                for (const salon of salonesData as SalonSource[]) {
                    diagnosticFailures.push({
                        salonId: salon.id_salon,
                        nombreSalon: salon.nombre_salon,
                        direccionSalon: salon.direccion_salon,
                        municipioSalon: salon.municipio_salon,
                        failedReason: "missing-key",
                        attempts: [],
                    });
                }
            } else {
                for (const salon of salonesData as SalonSource[]) {
                    const { response, failedReason } = await resolveSalonRating(salon, apiKey);
                    if (failedReason) {
                        diagnosticFailures.push({
                            salonId: salon.id_salon,
                            nombreSalon: salon.nombre_salon,
                            direccionSalon: salon.direccion_salon,
                            municipioSalon: salon.municipio_salon,
                            failedReason,
                            attempts: response.debug?.attempts ?? [],
                        });
                    }
                }
            }

            const diagnosticResponse: GoogleRatingsDiagnosticResponse = {
                diagnostic: true,
                totalSalones: (salonesData as SalonSource[]).length,
                failedCount: diagnosticFailures.length,
                failedSalones: diagnosticFailures,
            };

            return NextResponse.json<GoogleRatingsDiagnosticResponse>(diagnosticResponse);
        }

        if (!salonIdParam) {
            return NextResponse.json<GoogleRatingsErrorResponse>(
                { error: "salonId is required" },
                { status: 400 }
            );
        }

        const salonId = Number(salonIdParam);
        if (!Number.isInteger(salonId)) {
            return NextResponse.json<GoogleRatingsErrorResponse>(
                { error: "salonId must be an integer" },
                { status: 400 }
            );
        }

        const salon = (salonesData as SalonSource[]).find((item) => item.id_salon === salonId);
        if (!salon) {
            return NextResponse.json<GoogleRatingsErrorResponse>({ error: "Salon not found" }, { status: 404 });
        }

        const now = new Date();
        const validCache = await db.googleRatingsCache.findFirst({
            where: {
                id_salon: salon.id_salon,
                expires_at: {
                    gt: now,
                },
            },
        });

        if (validCache) {
            const cachedRating = mapCacheToRating(salon, validCache);
            return NextResponse.json<GoogleRatingsApiResponse>(buildAvailableResponse("cache", cachedRating, false));
        }

        const staleCache = await db.googleRatingsCache.findUnique({
            where: {
                id_salon: salon.id_salon,
            },
        });

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            logGoogleRatingsEvent("warn", "Google API key missing", {
                salonId: salon.id_salon,
                errorType: "missing-key",
                status: null,
                fallback: "unavailable",
                cacheAgeHours: staleCache ? getCacheAgeHours(staleCache.cached_at) : null,
            });

            return NextResponse.json<GoogleRatingsApiResponse>(
                buildUnavailableResponse(salon.id_salon, "missing-key")
            );
        }

        const { response, failedReason, failedStatus } = await resolveSalonRating(salon, apiKey);

        if (failedReason === "rate-limit") {
            if (staleCache) {
                const staleRating = mapCacheToRating(salon, staleCache);
                logGoogleRatingsEvent("warn", "Rate limit reached, serving stale cache", {
                    salonId: salon.id_salon,
                    errorType: "rate-limit",
                    status: failedStatus,
                    fallback: "stale-cache",
                    cacheAgeHours: getCacheAgeHours(staleCache.cached_at),
                });

                return NextResponse.json<GoogleRatingsApiResponse>(
                    buildAvailableResponse("stale-cache", staleRating, true)
                );
            }

            logGoogleRatingsEvent("error", "Rate limit reached and no cache available", {
                salonId: salon.id_salon,
                errorType: "rate-limit",
                status: failedStatus,
                fallback: "unavailable",
                cacheAgeHours: null,
            });

            return NextResponse.json<GoogleRatingsApiResponse>(
                buildUnavailableResponse(salon.id_salon, "rate-limit")
            );
        }

        if (failedReason === "upstream-error") {
            logGoogleRatingsEvent("error", "Upstream Google Places failure", {
                salonId: salon.id_salon,
                errorType: "upstream-error",
                status: failedStatus,
                fallback: "unavailable",
                cacheAgeHours: staleCache ? getCacheAgeHours(staleCache.cached_at) : null,
            });

            return NextResponse.json<GoogleRatingsApiResponse>(
                buildUnavailableResponse(salon.id_salon, "upstream-error")
            );
        }

        if (failedReason === "no-match") {
            logGoogleRatingsEvent("warn", "No Google Place match found", {
                salonId: salon.id_salon,
                errorType: "no-match",
                status: failedStatus,
                fallback: "none",
                cacheAgeHours: staleCache ? getCacheAgeHours(staleCache.cached_at) : null,
            });

            return NextResponse.json<GoogleRatingsApiResponse>(buildAvailableResponse("google", response, false));
        }

        const cachedAt = new Date();
        const expiresAt = new Date(cachedAt.getTime() + CACHE_TTL_MS);

        await db.googleRatingsCache.upsert({
            where: {
                id_salon: salon.id_salon,
            },
            create: {
                id_salon: salon.id_salon,
                google_rating: response.rating,
                review_count: response.reviewCount,
                google_place_name: response.googlePlaceName,
                formatted_address: response.formattedAddress,
                cached_at: cachedAt,
                expires_at: expiresAt,
            },
            update: {
                google_rating: response.rating,
                review_count: response.reviewCount,
                google_place_name: response.googlePlaceName,
                formatted_address: response.formattedAddress,
                cached_at: cachedAt,
                expires_at: expiresAt,
            },
        });

        return NextResponse.json<GoogleRatingsApiResponse>(buildAvailableResponse("google", response, false));
    } catch (error) {
        console.error("[google-ratings] Unhandled route error", {
            message: error instanceof Error ? error.message : "unknown",
        });
        return NextResponse.json<GoogleRatingsApiResponse>(
            buildUnavailableResponse(0, "upstream-error")
        );
    }
}
