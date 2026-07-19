import apiService, { type ApiPosition } from "./api";

export type Position = ApiPosition;

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
  try {
    const response = await fetch(`${apiService["baseURL"] || ""}/api/positions/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiService.hasAuthToken() ? { Authorization: `Bearer ${apiService["getAuthToken"]?.() || ""}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ positionId: _positionId, askingPrice: _askingPrice }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error?.message || "Failed to create listing" };
    }
    const data = await response.json();
    return { success: true, listingCode: data.listing?.code };
  } catch {
    return { success: false, error: "Position listing is not available yet. Backend API endpoint required." };
  }
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
  try {
    const response = await fetch(`${apiService["baseURL"] || ""}/api/positions/listings/${_code}`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.listing || null;
  } catch {
    return null;
  }
};

export const fetchAllListings = async (_marketId?: string): Promise<Position[]> => {
  try {
    const url = _marketId
      ? `${apiService["baseURL"] || ""}/api/positions/listings?marketId=${_marketId}`
      : `${apiService["baseURL"] || ""}/api/positions/listings`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return [];
    const data = await response.json();
    return data.listings || [];
  } catch {
    return [];
  }
};

export const purchaseListing = async (
  _positionId: string,
  _buyerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${apiService["baseURL"] || ""}/api/positions/listings/${_positionId}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ buyerId: _buyerId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error?.message || "Failed to purchase" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Purchase is not available yet. Backend API endpoint required." };
  }
};

export const cancelListing = async (
  _positionId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${apiService["baseURL"] || ""}/api/positions/listings/${_positionId}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error?.message || "Failed to cancel" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Cancel is not available yet. Backend API endpoint required." };
  }
};

export const updateListingPrice = async (
  _positionId: string,
  _newPrice: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${apiService["baseURL"] || ""}/api/positions/listings/${_positionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ askingPrice: _newPrice }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error?.message || "Failed to update price" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Update price is not available yet. Backend API endpoint required." };
  }
};

export const validateListingPrice = async (
  _marketId: string,
  _side: "YES" | "NO",
  askingPrice: number
): Promise<{ valid: boolean; error?: string; currentPrice?: number }> => {
  if (askingPrice <= 0) {
    return { valid: false, error: "Asking price must be greater than zero" };
  }

  if (askingPrice >= 100) {
    return { valid: false, error: "Asking price must be less than 100" };
  }

  return {
    valid: false,
    error: "Listing validation requires a backend API endpoint.",
  };
};
