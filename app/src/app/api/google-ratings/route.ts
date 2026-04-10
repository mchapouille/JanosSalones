import { NextResponse } from "next/server";
import { auth } from "@/auth";
import salonesData from "@/lib/salones_data.json";
import type { GoogleRating, GoogleRatingsErrorResponse } from "@/lib/google-ratings";

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
    failedReason: "no-match" | "upstream-error";
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

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const COUNTRY = "Argentina";
const PROVINCE_VARIATIONS = ["Buenos Aires", "GBA", "Provincia de Buenos Aires"] as const;

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

function logFailedRatingLookup(
    salon: SalonSource,
    attempts: PlaceSearchAttemptResult[],
    failedReason: "no-match" | "upstream-error"
): void {
    console.warn("[google-ratings] rating lookup failed", {
        salonId: salon.id_salon,
        nombre_salon: salon.nombre_salon,
        direccion_salon: salon.direccion_salon,
        failedReason,
        attempts,
    });
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
        try {
            googleError = await placesResponse.text();
        } catch {
            googleError = null;
        }
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

async function resolveSalonRating(salon: SalonSource, apiKey: string): Promise<{
    response: GoogleRatingWithDebug;
    failedReason: "no-match" | "upstream-error" | null;
}> {
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

        if (result.status >= 500 || result.status === 429) {
            logFailedRatingLookup(salon, debugAttempts, "upstream-error");
            return {
                response: {
                    ...buildNoMatchResponse(salon),
                    debug: { attempts: debugAttempts },
                },
                failedReason: "upstream-error",
            };
        }

        if (place) {
            matchedPlace = place;
            break;
        }
    }

    if (!matchedPlace) {
        const noMatchResponse: GoogleRatingWithDebug = {
            ...buildNoMatchResponse(salon),
            debug: { attempts: debugAttempts },
        };

        logFailedRatingLookup(salon, debugAttempts, "no-match");
        return { response: noMatchResponse, failedReason: "no-match" };
    }

    const reviewCount = matchedPlace.userRatingCount ?? 0;
    const rating = typeof matchedPlace.rating === "number" && reviewCount > 0 ? matchedPlace.rating : 0;

    const responseQuery = normalizeQuery([
        matchedPlace.displayName?.text,
        matchedPlace.formattedAddress,
    ]);

    const response: GoogleRatingWithDebug = {
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
    };

    return { response, failedReason: null };
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

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            return NextResponse.json<GoogleRatingsErrorResponse>(
                { error: "Google Places API unavailable" },
                { status: 502 }
            );
        }

        if (diagnosticMode) {
            const diagnosticFailures: GoogleRatingsDiagnosticFailure[] = [];

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

        const { response, failedReason } = await resolveSalonRating(salon, apiKey);
        if (failedReason === "upstream-error") {
            return NextResponse.json<GoogleRatingsErrorResponse & { debug: GoogleRatingDebug }>(
                {
                    error: "Google Places API unavailable",
                    debug: response.debug ?? { attempts: [] },
                },
                { status: 502 }
            );
        }

        return NextResponse.json<GoogleRatingWithDebug>(response);
    } catch (error) {
        console.error("Error fetching Google rating:", error);
        return NextResponse.json<GoogleRatingsErrorResponse>(
            { error: "Google Places API unavailable" },
            { status: 502 }
        );
    }
}
