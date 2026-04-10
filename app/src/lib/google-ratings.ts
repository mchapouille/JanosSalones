export interface GoogleRating {
    salonId: number;
    nombreSalon: string;
    rating: number | null;
    reviewCount: number;
    googlePlaceName: string | null;
    formattedAddress: string | null;
}

export interface GoogleRatingsErrorResponse {
    error: string;
}

export type GoogleRatingsSource = "google";

export type GoogleRatingsFailureType = "rate-limit" | "missing-key" | "upstream-error";

export interface GoogleRatingsAvailableResponse {
    state: "available";
    source: GoogleRatingsSource;
    rating: GoogleRating;
}

export interface GoogleRatingsUnavailableResponse {
    state: "unavailable";
    reason: GoogleRatingsFailureType;
    message: string;
    salonId: number;
}

export type GoogleRatingsApiResponse = GoogleRatingsAvailableResponse | GoogleRatingsUnavailableResponse;
