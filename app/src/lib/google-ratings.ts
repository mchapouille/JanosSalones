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
