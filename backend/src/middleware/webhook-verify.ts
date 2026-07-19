/**
 * Webhook signature verification for Paystack, Flutterwave, and Monnify.
 *
 * Each provider signs the raw request body with a shared secret and sends the
 * signature in a provider-specific header. We recompute the HMAC locally and
 * compare using timing-safe comparison to prevent timing attacks.
 */

import crypto from 'node:crypto';
import { Request } from 'express';

type PaymentProvider = 'paystack' | 'flutterwave' | 'monnify';

/**
 * Verify the Paystack webhook signature.
 *
 * Paystack signs the raw body with HMAC-SHA256 using PAYSTACK_SECRET_KEY
 * and sends the hex digest in `x-paystack-signature`.
 */
const verifyPaystackSignature = (rawBody: Buffer | string, signature: unknown): boolean => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  if (typeof signature !== 'string' || !signature) return false;

  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
};

/**
 * Verify the Flutterwave webhook signature.
 *
 * Flutterwave sends the FLUTTERWAVE_SECRET_HASH as-is in the `verif-hash`
 * header (not HMAC — just a shared secret comparison).
 */
const verifyFlutterwaveSignature = (signature: unknown): boolean => {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) return false;
  if (typeof signature !== 'string' || !signature) return false;

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(secretHash), Buffer.from(signature));
  } catch {
    return false;
  }
};

/**
 * Verify the Monnify webhook signature.
 *
 * Monnify signs the raw body with HMAC-SHA256 using MONNIFY_SECRET_KEY
 * and sends the hex digest in `monnify-signature`.
 */
const verifyMonnifySignature = (rawBody: Buffer | string, signature: unknown): boolean => {
  const secret = process.env.MONNIFY_SECRET_KEY;
  if (!secret) return false;
  if (typeof signature !== 'string' || !signature) return false;

  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
};

/**
 * Verify the webhook signature for any supported provider.
 *
 * @returns true if the signature is valid, false otherwise.
 *          Also returns false if the provider is not configured (no env key).
 */
export const verifyWebhookSignature = (provider: PaymentProvider, rawBody: Buffer | string, req: Request): boolean => {
  switch (provider) {
    case 'paystack':
      return verifyPaystackSignature(rawBody, req.headers['x-paystack-signature']);
    case 'flutterwave':
      return verifyFlutterwaveSignature(req.headers['verif-hash']);
    case 'monnify':
      return verifyMonnifySignature(rawBody, req.headers['monnify-signature']);
    default:
      return false;
  }
};

/**
 * Extract the payment reference from a provider-specific webhook body.
 */
export const extractWebhookReference = (provider: PaymentProvider, body: any): string => {
  switch (provider) {
    case 'paystack':
      return body?.data?.reference || body?.reference || '';
    case 'flutterwave':
      return body?.data?.tx_ref || body?.tx_ref || '';
    case 'monnify':
      return body?.responseBody?.paymentReference || body?.paymentReference || '';
    default:
      return '';
  }
};

/**
 * Confirm the webhook event type is a payment success event.
 * We ignore other event types (e.g. transfer.failed) to avoid processing irrelevant webhooks.
 */
export const isPaymentSuccessEvent = (provider: PaymentProvider, body: any): boolean => {
  switch (provider) {
    case 'paystack':
      // Paystack sends event: "charge.success"
      return body?.event === 'charge.success';
    case 'flutterwave':
      // Flutterwave sends event: "charge.completed" and data.status: "successful"
      return body?.event === 'charge.completed' || body?.data?.status === 'successful';
    case 'monnify':
      // Monnify sends event: "successful" for successful payments
      return body?.responseBody?.paymentStatus === 'PAID' || body?.event === 'successful';
    default:
      return true; // If unknown provider, proceed (already signature-verified)
  }
};
