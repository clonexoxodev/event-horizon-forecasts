import { supabase } from "./supabase";

export type Position = {
  id: string;
  userId: string;
  marketId: string;
  side: "YES" | "NO";
  stake: number;
  entryPrice: number;
  currentPrice: number;
  currentValue: number;
  marketQuestion: string;
  marketIcon: string;
  marketStatus: "active" | "closed" | "resolved";
  createdAt: string;
  // Listing fields
  isListed: boolean;
  listingCode?: string;
  askingPrice?: number;
  listedAt?: string;
};

// Generate unique listing code
export const generateListingCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate shareable link
export const generateShareableLink = (listingCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/listing/${listingCode}`;
};

// Create position listing
export const createPositionListing = async (
  positionId: string,
  askingPrice: number
): Promise<{ success: boolean; listingCode?: string; error?: string }> => {
  const listingCode = generateListingCode();
  
  const { error } = await supabase
    .from("position_listings")
    .insert({
      position_id: positionId,
      listing_code: listingCode,
      asking_price: askingPrice,
      status: "active",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, listingCode };
};

// Fetch user positions with listing status
export const fetchUserPositions = async (userId: string): Promise<Position[]> => {
  const { data, error } = await supabase
    .from("positions")
    .select(`
      *,
      markets (*),
      position_listings (
        listing_code,
        asking_price,
        status,
        created_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching positions:", error);
    return [];
  }

  return data.map((p: any) => {
    const market = p.markets;
    const listing = p.position_listings?.[0];
    
    // Calculate current price based on side
    const yesPool = market?.yes_pool ?? 0;
    const noPool = market?.no_pool ?? 0;
    const totalPool = yesPool + noPool;
    const currentYesPrice = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
    const currentNoPrice = 100 - currentYesPrice;
    const currentPrice = p.side === "YES" ? currentYesPrice : currentNoPrice;
    
    // Calculate current value (simplified - actual would need market maker formula)
    const priceChange = currentPrice - p.entry_price;
    const currentValue = p.stake * (1 + priceChange / 100);
    
    return {
      id: p.id,
      userId: p.user_id,
      marketId: p.market_id,
      side: p.side,
      stake: p.stake,
      entryPrice: p.entry_price,
      currentPrice,
      currentValue,
      marketQuestion: market?.question ?? "Unknown Market",
      marketIcon: market?.icon ?? "📊",
      marketStatus: market?.status ?? "active",
      createdAt: p.created_at,
      isListed: listing?.status === "active",
      listingCode: listing?.listing_code,
      askingPrice: listing?.asking_price,
      listedAt: listing?.created_at,
    };
  });
};

// Calculate estimated value
export const calculateEstimatedValue = (
  stake: number,
  entryPrice: number,
  currentPrice: number
): number => {
  const priceChange = currentPrice - entryPrice;
  return stake * (1 + priceChange / 100);
};

// Fetch listing by code
export const fetchListingByCode = async (code: string): Promise<Position | null> => {
  const { data, error } = await supabase
    .from("position_listings")
    .select(`
      *,
      positions (
        *,
        markets (*)
      )
    `)
    .eq("listing_code", code)
    .eq("status", "active")
    .single();

  if (error || !data) {
    console.error("Error fetching listing:", error);
    return null;
  }

  const position = data.positions;
  const market = position.markets;

  // Calculate current price
  const yesPool = market?.yes_pool ?? 0;
  const noPool = market?.no_pool ?? 0;
  const totalPool = yesPool + noPool;
  const currentYesPrice = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const currentNoPrice = 100 - currentYesPrice;
  const currentPrice = position.side === "YES" ? currentYesPrice : currentNoPrice;

  // Calculate current value
  const priceChange = currentPrice - position.entry_price;
  const currentValue = position.stake * (1 + priceChange / 100);

  return {
    id: position.id,
    userId: position.user_id,
    marketId: position.market_id,
    side: position.side,
    stake: position.stake,
    entryPrice: position.entry_price,
    currentPrice,
    currentValue,
    marketQuestion: market?.question ?? "Unknown Market",
    marketIcon: market?.icon ?? "📊",
    marketStatus: market?.status ?? "active",
    createdAt: position.created_at,
    isListed: true,
    listingCode: data.listing_code,
    askingPrice: data.asking_price,
    listedAt: data.created_at,
  };
};

// Fetch all active listings (optionally filtered by market)
export const fetchAllListings = async (marketId?: string): Promise<Position[]> => {
  let query = supabase
    .from("position_listings")
    .select(`
      *,
      positions (
        *,
        markets (*)
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);

  // Apply market filter if provided
  if (marketId) {
    query = query.eq("positions.market_id", marketId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching listings:", error);
    return [];
  }

  return data.map((listing: any) => {
    const position = listing.positions;
    const market = position.markets;

    // Calculate current price
    const yesPool = market?.yes_pool ?? 0;
    const noPool = market?.no_pool ?? 0;
    const totalPool = yesPool + noPool;
    const currentYesPrice = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
    const currentNoPrice = 100 - currentYesPrice;
    const currentPrice = position.side === "YES" ? currentYesPrice : currentNoPrice;

    // Calculate current value
    const priceChange = currentPrice - position.entry_price;
    const currentValue = position.stake * (1 + priceChange / 100);

    return {
      id: position.id,
      userId: position.user_id,
      marketId: position.market_id,
      side: position.side,
      stake: position.stake,
      entryPrice: position.entry_price,
      currentPrice,
      currentValue,
      marketQuestion: market?.question ?? "Unknown Market",
      marketIcon: market?.icon ?? "📊",
      marketStatus: market?.status ?? "active",
      createdAt: position.created_at,
      isListed: true,
      listingCode: listing.listing_code,
      askingPrice: listing.asking_price,
      listedAt: listing.created_at,
    };
  });
};

// Purchase listing
export const purchaseListing = async (
  positionId: string,
  buyerId: string
): Promise<{ success: boolean; error?: string }> => {
  // In a real implementation, this would:
  // 1. Start a transaction
  // 2. Verify buyer has sufficient balance
  // 3. Transfer funds from buyer to seller
  // 4. Update position owner
  // 5. Mark listing as sold
  // 6. Create transaction records
  
  const { error } = await supabase
    .from("position_listings")
    .update({ status: "sold" })
    .eq("position_id", positionId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update position owner
  const { error: positionError } = await supabase
    .from("positions")
    .update({ user_id: buyerId })
    .eq("id", positionId);

  if (positionError) {
    return { success: false, error: positionError.message };
  }

  return { success: true };
};

// Cancel listing
export const cancelListing = async (
  positionId: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from("position_listings")
    .update({ status: "cancelled" })
    .eq("position_id", positionId)
    .eq("status", "active");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Update listing price
export const updateListingPrice = async (
  positionId: string,
  newPrice: number
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from("position_listings")
    .update({ asking_price: newPrice })
    .eq("position_id", positionId)
    .eq("status", "active");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Validate listing price based on market status
export const validateListingPrice = async (
  marketId: string,
  side: "YES" | "NO",
  askingPrice: number
): Promise<{ valid: boolean; error?: string; currentPrice?: number }> => {
  // Fetch market data
  const { data: market, error } = await supabase
    .from("markets")
    .select("status, yes_pool, no_pool")
    .eq("id", marketId)
    .single();

  if (error || !market) {
    return { valid: false, error: "Market not found" };
  }

  // Calculate current market price
  const yesPool = market.yes_pool ?? 0;
  const noPool = market.no_pool ?? 0;
  const totalPool = yesPool + noPool;
  
  if (totalPool === 0) {
    return { valid: false, error: "Market has no liquidity" };
  }

  const currentYesPrice = Math.round((yesPool / totalPool) * 100);
  const currentNoPrice = 100 - currentYesPrice;
  const currentPrice = side === "YES" ? currentYesPrice : currentNoPrice;

  // Validate based on market status
  if (market.status === "open") {
    // Open markets: asking price cannot exceed current market price
    if (askingPrice > currentPrice) {
      return {
        valid: false,
        error: `Asking price cannot exceed current market price of ${currentPrice}%`,
        currentPrice,
      };
    }
  }
  // Closed or resolved markets: any positive price is allowed
  else if (market.status === "closed" || market.status === "resolved") {
    if (askingPrice <= 0) {
      return {
        valid: false,
        error: "Asking price must be greater than zero",
        currentPrice,
      };
    }
  }

  return { valid: true, currentPrice };
};
