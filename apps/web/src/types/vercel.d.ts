/**
 * Type definitions for Vercel Edge Runtime features
 * These are available in production on Vercel but not typed by default
 */

import { NextRequest as OriginalNextRequest } from 'next/server'

declare global {
  /**
   * Extended NextRequest with Vercel's geo property
   * Note: This is only available when deployed to Vercel
   */
  interface NextRequest extends OriginalNextRequest {
    /**
     * Geolocation data (only available on Vercel)
     */
    geo?: {
      /** Two-letter country code (e.g., 'SG' for Singapore) */
      country?: string
      /** Country region code */
      region?: string
      /** City name */
      city?: string
      /** Latitude */
      latitude?: string
      /** Longitude */
      longitude?: string
    }
    
    /**
     * Client IP address (only available on Vercel)
     */
    ip?: string
  }

  /**
   * Vercel-specific headers available in edge runtime
   */
  interface VercelHeaders {
    /** Client's country code (ISO 3166-1 alpha-2) */
    'x-vercel-ip-country'?: string
    /** Client's region within the country */
    'x-vercel-ip-country-region'?: string
    /** Client's city */
    'x-vercel-ip-city'?: string
    /** Client's latitude */
    'x-vercel-ip-latitude'?: string
    /** Client's longitude */
    'x-vercel-ip-longitude'?: string
    /** Client's timezone */
    'x-vercel-ip-timezone'?: string
    /** Forwarded IP addresses */
    'x-forwarded-for'?: string
    /** Real client IP */
    'x-real-ip'?: string
    /** Forwarded protocol (http/https) */
    'x-forwarded-proto'?: string
    /** Forwarded host */
    'x-forwarded-host'?: string
    /** Vercel deployment URL */
    'x-vercel-deployment-url'?: string
    /** Vercel request ID for tracing */
    'x-vercel-id'?: string
  }
}

/**
 * Helper to safely get geolocation data
 * Works both locally and on Vercel
 */
export function getGeolocation(request: NextRequest): {
  country: string
  region: string
  city: string
  latitude?: string
  longitude?: string
} {
  // Try to get from headers (works on Vercel)
  const fromHeaders = {
    country: request.headers.get('x-vercel-ip-country') || '',
    region: request.headers.get('x-vercel-ip-country-region') || '',
    city: request.headers.get('x-vercel-ip-city') || '',
    latitude: request.headers.get('x-vercel-ip-latitude') || undefined,
    longitude: request.headers.get('x-vercel-ip-longitude') || undefined,
  }
  
  // In development, use default values
  if (process.env.NODE_ENV === 'development') {
    return {
      country: 'SG',
      region: 'Singapore',
      city: 'Singapore',
      latitude: '1.3521',
      longitude: '103.8198',
    }
  }
  
  // Return Vercel headers or defaults
  return {
    country: fromHeaders.country || 'SG',
    region: fromHeaders.region || '',
    city: fromHeaders.city || '',
    latitude: fromHeaders.latitude,
    longitude: fromHeaders.longitude,
  }
}

/**
 * Helper to get client IP address
 * Works both locally and on Vercel
 */
export function getClientIp(request: NextRequest): string | null {
  // Try various headers in order of preference
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.ip || // This might be available on Vercel
    null
  )
}

/**
 * Helper to check if running on Vercel
 */
export function isVercelEdge(): boolean {
  return process.env.VERCEL_ENV !== undefined
}

export {}