import apiService, { type ApiPosition } from "./api";

export type Position = ApiPosition;

const unsupportedListingResult = {
  success: false,
  error: "Position listing actions must be implemented through backend APIs before use.",
};

export const generateListingCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateShareableLink = (listingCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/listing/${listingCode}`;
};

export const createPositionListing = async (
  _positionId: string,
  _askingPrice: number
): Promise<{ success: boolean; listingCode?: string; error?: string }> => {
  return unsupportedListingResult;
};

export const fetchUserPositions = async (_userId: string): Promise<Position[]> => {
  const response = await apiService.getPositions();
  return response.positions;
};

export const calculateEstimatedValue = (
  stake: number,
  entryPrice: number,
  currentPrice: number
): number => {
  const priceChange = currentPrice - entryPrice;
  return stake * (1 + priceChange / 100);
};

export const fetchListingByCode = async (_code: string): Promise<Position | null> => {
  console.warn("Listing reads require a backend API before they can be enabled.");
  return null;
};

export const fetchAllListings = async (_marketId?: string): Promise<Position[]> => {
  console.warn("Listing reads require a backend API before they can be enabled.");
  return [];
};

export const purchaseListing = async (
  _positionId: string,
  _buyerId: string
): Promise<{ success: boolean; error?: string }> => {
  return unsupportedListingResult;
};

export const cancelListing = async (
  _positionId: string
): Promise<{ success: boolean; error?: string }> => {
  return unsupportedListingResult;
};

export const updateListingPrice = async (
  _positionId: string,
  _newPrice: number
): Promise<{ success: boolean; error?: string }> => {
  return unsupportedListingResult;
};

export const validateListingPrice = async (
  _marketId: string,
  _side: "YES" | "NO",
  askingPrice: number
): Promise<{ valid: boolean; error?: string; currentPrice?: number }> => {
  if (askingPrice <= 0) {
    return { valid: false, error: "Asking price must be greater than zero" };
  }

  return {
    valid: false,
    error: "Listing validation must be implemented through backend APIs before use.",
  };
};
