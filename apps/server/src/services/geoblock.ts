"use strict";

/**
 * GEO-BLOCKING SERVICE
 * Handles IP geolocation and country-based access control
 */

import { PrismaClient, GeoBlockType } from '@prisma/client';
import geoip from 'geoip-lite';

const prisma = new PrismaClient();

export interface GeoLocation {
    ip: string;
    countryCode: string | null;
    countryName: string | null;
    city: string | null;
    region: string | null;
    timezone: string | null;
}

/**
 * Get geolocation data from an IP address
 * Uses geoip-lite for offline, fast lookups
 */
export function getGeoFromIP(ip: string): GeoLocation {
    // Handle localhost and private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
            ip,
            countryCode: null,
            countryName: null,
            city: null,
            region: null,
            timezone: null,
        };
    }

    const geo = geoip.lookup(ip);

    if (!geo) {
        return {
            ip,
            countryCode: null,
            countryName: null,
            city: null,
            region: null,
            timezone: null,
        };
    }

    // Map country code to name
    const countryNames: Record<string, string> = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'JP': 'Japan',
        'CN': 'China',
        'IN': 'India',
        'BR': 'Brazil',
        'RU': 'Russia',
        'IR': 'Iran',
        'KP': 'North Korea',
        'SY': 'Syria',
        'CU': 'Cuba',
        // Add more as needed
    };

    return {
        ip,
        countryCode: geo.country,
        countryName: countryNames[geo.country] || geo.country,
        city: geo.city || null,
        region: geo.region || null,
        timezone: geo.timezone || null,
    };
}

/**
 * Check if an IP is geo-blocked at the platform level
 */
export async function isPlatformGeoBlocked(ip: string): Promise<{
    blocked: boolean;
    reason?: string;
    blockType?: GeoBlockType;
}> {
    const geo = getGeoFromIP(ip);

    if (!geo.countryCode) {
        return { blocked: false };
    }

    // Check for platform-wide geo-blocks (territoryId is null)
    const block = await prisma.geoBlock.findFirst({
        where: {
            territoryId: null,
            countryCode: geo.countryCode,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ],
        },
    });

    if (block) {
        return {
            blocked: true,
            reason: block.reason || `Access from ${geo.countryName} is restricted`,
            blockType: block.blockType,
        };
    }

    return { blocked: false };
}

/**
 * Check if an IP is geo-blocked for a specific territory
 */
export async function isTerritoryGeoBlocked(ip: string, territoryId: string): Promise<{
    blocked: boolean;
    reason?: string;
    blockType?: GeoBlockType;
}> {
    const geo = getGeoFromIP(ip);

    if (!geo.countryCode) {
        return { blocked: false };
    }

    const block = await prisma.geoBlock.findFirst({
        where: {
            territoryId,
            countryCode: geo.countryCode,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ],
        },
    });

    if (block) {
        return {
            blocked: true,
            reason: block.reason || `Access from ${geo.countryName} is restricted for this community`,
            blockType: block.blockType,
        };
    }

    return { blocked: false };
}

/**
 * Add a geo-block (platform or territory level)
 */
export async function addGeoBlock(params: {
    countryCode: string;
    countryName: string;
    reason?: string;
    blockType?: GeoBlockType;
    territoryId?: string; // null = platform-wide
    createdById: string;
    expiresAt?: Date;
}) {
    return prisma.geoBlock.create({
        data: {
            countryCode: params.countryCode,
            countryName: params.countryName,
            reason: params.reason,
            blockType: params.blockType || 'FULL',
            territoryId: params.territoryId || null,
            createdById: params.createdById,
            expiresAt: params.expiresAt,
        },
    });
}

/**
 * Remove a geo-block
 */
export async function removeGeoBlock(id: string) {
    return prisma.geoBlock.delete({
        where: { id },
    });
}

/**
 * List all geo-blocks (optionally filtered by territory)
 */
export async function listGeoBlocks(territoryId?: string | null) {
    return prisma.geoBlock.findMany({
        where: territoryId === null
            ? { territoryId: null } // Platform-wide only
            : territoryId
                ? { territoryId } // Specific territory
                : {}, // All
        orderBy: { createdAt: 'desc' },
    });
}

// Common high-risk countries for reference
export const HIGH_RISK_COUNTRIES = [
    { code: 'KP', name: 'North Korea' },
    { code: 'IR', name: 'Iran' },
    { code: 'SY', name: 'Syria' },
    { code: 'CU', name: 'Cuba' },
    { code: 'RU', name: 'Russia' },
    { code: 'BY', name: 'Belarus' },
];

// All countries list for UI
export const ALL_COUNTRIES = [
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CN', name: 'China' },
    { code: 'CU', name: 'Cuba' },
    { code: 'DE', name: 'Germany' },
    { code: 'EG', name: 'Egypt' },
    { code: 'FR', name: 'France' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IN', name: 'India' },
    { code: 'IR', name: 'Iran' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IL', name: 'Israel' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'JO', name: 'Jordan' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LY', name: 'Libya' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MA', name: 'Morocco' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RU', name: 'Russia' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ES', name: 'Spain' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TR', name: 'Turkey' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'US', name: 'United States' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'YE', name: 'Yemen' },
];

export default {
    getGeoFromIP,
    isPlatformGeoBlocked,
    isTerritoryGeoBlocked,
    addGeoBlock,
    removeGeoBlock,
    listGeoBlocks,
    HIGH_RISK_COUNTRIES,
    ALL_COUNTRIES,
};
