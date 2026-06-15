import { z } from 'zod';

/**
 * Market Validation Schemas
 * 
 * These schemas validate market creation, updates, and status changes
 * with comprehensive business rules and constraints.
 */

// Market status enum
export const MarketStatus = z.enum(['draft', 'active', 'closed', 'pending_resolution', 'resolved', 'cancelled', 'archived']);
export type MarketStatus = z.infer<typeof MarketStatus>;

// Market type enum
export const MarketType = z.enum(['binary', 'multiple_choice']);
export type MarketType = z.infer<typeof MarketType>;

// Currency enum
export const Currency = z.enum(['NGN', 'USD']);
export type Currency = z.infer<typeof Currency>;

// Outcome enum
export const Outcome = z.enum(['YES', 'NO', 'INVALID']);
export type Outcome = z.infer<typeof Outcome>;

// Shared market categories. Keep this aligned with the frontend category config.
export const MARKET_CATEGORIES = [
  'Sports',
  'Crypto',
  'Politics',
  'Economy',
  'Entertainment',
  'Music',
  'Technology',
  'Business',
  'Global',
  'Other',
] as const;

const CATEGORY_ALIASES: Record<string, typeof MARKET_CATEGORIES[number]> = {
  finance: 'Economy',
  financial: 'Economy',
  economics: 'Economy',
  economy: 'Economy',
  cryptocurrency: 'Crypto',
  crypto: 'Crypto',
  tech: 'Technology',
  technology: 'Technology',
  companies: 'Business',
  company: 'Business',
  business: 'Business',
  global_events: 'Global',
  international: 'Global',
  world: 'Global',
  general: 'Other',
  others: 'Other',
  other: 'Other',
};

export const normalizeMarketCategory = (category: unknown): typeof MARKET_CATEGORIES[number] => {
  const raw = String(category || '').trim();
  if (!raw) return 'Other';

  const direct = MARKET_CATEGORIES.find((item) => item.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;

  return CATEGORY_ALIASES[raw.toLowerCase()] || 'Other';
};

export const MarketCategory = z.preprocess(
  (value) => normalizeMarketCategory(value),
  z.enum(MARKET_CATEGORIES)
);
export type MarketCategory = z.infer<typeof MarketCategory>;

/**
 * Market Creation Schema
 * Validates all fields required to create a new market
 */
export const MarketCreateSchema = z.object({
  question: z.string()
    .min(10, 'Question must be at least 10 characters')
    .max(500, 'Question must be less than 500 characters'),
  
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  
  category: MarketCategory,
  
  country_filter: z.string()
    .length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)')
    .optional(),
  
  market_type: MarketType.default('binary'),
  
  yes_label: z.string()
    .max(50, 'YES label must be less than 50 characters')
    .default('Yes'),
  
  no_label: z.string()
    .max(50, 'NO label must be less than 50 characters')
    .default('No'),
  
  yes_price: z.number()
    .min(0, 'YES price must be at least 0')
    .max(100, 'YES price must be at most 100')
    .optional(),
  
  no_price: z.number()
    .min(0, 'NO price must be at least 0')
    .max(100, 'NO price must be at most 100')
    .optional(),

  starting_yes_price: z.number()
    .min(1, 'Starting YES price must be at least 1')
    .max(99, 'Starting YES price must be at most 99')
    .optional(),

  starting_no_price: z.number()
    .min(1, 'Starting NO price must be at least 1')
    .max(99, 'Starting NO price must be at most 99')
    .optional(),
  
  close_date: z.string()
    .datetime({ message: 'Close date must be a valid ISO 8601 datetime' }),
  
  resolution_date: z.string()
    .datetime({ message: 'Resolution date must be a valid ISO 8601 datetime' }),
  
  resolution_source: z.string()
    .min(1, 'Resolution source is required')
    .max(1000, 'Resolution source must be less than 1000 characters')
    .optional(),

  resolution_instructions: z.string()
    .min(1, 'Rules / resolution criteria are required')
    .max(5000, 'Resolution instructions must be less than 5000 characters')
    .optional(),
  
  status: z.enum(['draft', 'active']),
  
  currency: Currency.default('NGN'),
  
  image_url: z.string()
    .url('Image URL must be a valid URL')
    .max(500, 'Image URL must be less than 500 characters')
    .optional(),

  video_url: z.string()
    .url('Video URL must be a valid URL')
    .max(500, 'Video URL must be less than 500 characters')
    .optional(),

  is_trending: z.boolean().default(false).optional(),

  min_position_smallest_unit: z.number().int().nonnegative().optional(),

  max_position_smallest_unit: z.number().int().positive().optional(),
})
.refine(
  (data) => {
    const yesPrice = data.starting_yes_price ?? data.yes_price;
    const noPrice = data.starting_no_price ?? data.no_price;
    return yesPrice === undefined || noPrice === undefined || Math.round(yesPrice + noPrice) === 100;
  },
  {
    message: 'YES and NO prices must sum to 100',
    path: ['starting_yes_price'],
  }
)
.refine(
  (data) => Boolean(data.image_url || data.video_url),
  {
    message: 'A market requires either an image or a video',
    path: ['image_url'],
  }
)
.refine(
  (data) => Boolean(data.resolution_instructions?.trim()),
  {
    message: 'Rules / resolution criteria are required',
    path: ['resolution_instructions'],
  }
)
.refine(
  (data) => Boolean(data.resolution_source?.trim()),
  {
    message: 'Resolution source is required',
    path: ['resolution_source'],
  }
)
.refine(
  (data) => {
    if (!data.min_position_smallest_unit || !data.max_position_smallest_unit) return true;
    return data.max_position_smallest_unit >= data.min_position_smallest_unit;
  },
  {
    message: 'Maximum amount must be greater than or equal to minimum amount',
    path: ['max_position_smallest_unit'],
  }
)
.refine(
  (data) => new Date(data.close_date) > new Date(),
  {
    message: 'Close date must be in the future',
    path: ['close_date'],
  }
)
.refine(
  (data) => new Date(data.resolution_date) > new Date(data.close_date),
  {
    message: 'Resolution date must be after close date',
    path: ['resolution_date'],
  }
);

export type MarketCreateInput = z.infer<typeof MarketCreateSchema>;

/**
 * Market Update Schema
 * Validates partial updates to existing markets
 * Field editability is enforced separately based on market status
 */
export const MarketUpdateSchema = z.object({
  question: z.string()
    .min(10)
    .max(500)
    .optional(),
  
  description: z.string()
    .max(5000)
    .optional(),
  
  category: MarketCategory.optional(),
  
  country_filter: z.string()
    .length(2)
    .optional()
    .nullable(),
  
  market_type: MarketType.optional(),
  
  yes_label: z.string()
    .max(50)
    .optional(),
  
  no_label: z.string()
    .max(50)
    .optional(),
  
  yes_price: z.number()
    .min(0)
    .max(100)
    .optional(),
  
  no_price: z.number()
    .min(0)
    .max(100)
    .optional(),
  
  close_date: z.string()
    .datetime()
    .optional(),
  
  resolution_date: z.string()
    .datetime()
    .optional(),
  
  resolution_source: z.string()
    .max(1000)
    .optional()
    .nullable(),

  resolution_instructions: z.string()
    .max(5000)
    .optional()
    .nullable(),
  
  currency: Currency.optional(),
  
  image_url: z.string()
    .url()
    .max(500)
    .optional()
    .nullable(),

  video_url: z.string()
    .url()
    .max(500)
    .optional()
    .nullable(),

  is_trending: z.boolean().optional(),

  seed_liquidity_yes_smallest_unit: z.number().int().positive().optional(),

  seed_liquidity_no_smallest_unit: z.number().int().positive().optional(),

  min_position_smallest_unit: z.number().int().nonnegative().optional(),

  max_position_smallest_unit: z.number().int().positive().optional(),
})
.refine(
  (data) => {
    // Only validate price sum if both prices are provided
    if (data.yes_price !== undefined && data.no_price !== undefined) {
      return data.yes_price + data.no_price === 100;
    }
    return true;
  },
  {
    message: 'YES and NO prices must sum to 100',
    path: ['yes_price'],
  }
)
.refine(
  (data) => {
    // Only validate date ordering if both dates are provided
    if (data.close_date && data.resolution_date) {
      return new Date(data.resolution_date) > new Date(data.close_date);
    }
    return true;
  },
  {
    message: 'Resolution date must be after close date',
    path: ['resolution_date'],
  }
);

export type MarketUpdateInput = z.infer<typeof MarketUpdateSchema>;

/**
 * Status Change Schema
 * Validates market status transitions
 */
export const StatusChangeSchema = z.object({
  status: MarketStatus,
  outcome: Outcome.optional(),
  resolution_source: z.string()
    .max(1000)
    .optional(),
})
.refine(
  (data) => {
    // If status is 'resolved', outcome and resolution_source are required
    if (data.status === 'resolved') {
      return data.outcome !== undefined && data.resolution_source !== undefined;
    }
    return true;
  },
  {
    message: 'Outcome and resolution source are required when resolving a market',
    path: ['outcome'],
  }
);

export type StatusChangeInput = z.infer<typeof StatusChangeSchema>;

/**
 * Bulk Action Schema
 * Validates bulk operations on multiple markets
 */
export const BulkActionSchema = z.object({
  market_ids: z.array(z.string().uuid())
    .min(1, 'At least one market ID is required'),
  
  status: z.enum(['closed', 'archived']),
});

export type BulkActionInput = z.infer<typeof BulkActionSchema>;

/**
 * Market Filters Schema
 * Validates query parameters for market listing
 */
export const MarketFiltersSchema = z.object({
  status: MarketStatus.optional(),
  category: MarketCategory.optional(),
  search: z.string().optional(),
  sort: z.enum(['close_date', 'pool_amount', 'created_at']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type MarketFilters = z.infer<typeof MarketFiltersSchema>;

/**
 * Valid Status Transitions
 * Defines which status transitions are allowed
 */
export const VALID_TRANSITIONS: Record<MarketStatus, MarketStatus[]> = {
  draft: ['active', 'draft'],
  active: ['closed', 'pending_resolution', 'resolved', 'cancelled'],
  closed: ['pending_resolution', 'resolved', 'cancelled'],
  pending_resolution: ['resolved', 'cancelled'],
  resolved: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

/**
 * Editable Fields by Status
 * Defines which fields can be edited for each market status
 */
export const EDITABLE_FIELDS_BY_STATUS: Record<MarketStatus, string[]> = {
  draft: ['*'], // All fields editable
  active: ['description', 'resolution_source', 'resolution_instructions', 'is_trending'],
  closed: ['resolution_source', 'resolution_instructions', 'is_trending'],
  pending_resolution: ['resolution_source', 'resolution_instructions', 'is_trending'],
  resolved: ['status'], // Only status change to archived
  cancelled: ['status'],
  archived: [], // No edits allowed
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: MarketStatus, to: MarketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a field can be edited for a given market status
 */
export function canEditField(status: MarketStatus, field: string): boolean {
  const allowed = EDITABLE_FIELDS_BY_STATUS[status];
  return allowed?.includes('*') || allowed?.includes(field) || false;
}

/**
 * Validate that only editable fields are being updated
 */
export function validateEditableFields(
  status: MarketStatus,
  updates: Partial<MarketUpdateInput>
): { valid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];
  
  for (const field of Object.keys(updates)) {
    if (!canEditField(status, field)) {
      invalidFields.push(field);
    }
  }
  
  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}
