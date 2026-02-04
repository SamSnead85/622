"use strict";

/**
 * SECURITY ADMIN ROUTES
 * SuperAdmin endpoints for platform security management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
    logSecurityEvent,
    SecurityEvents,
    blockIP,
    unblockIP,
    listBlockedIPs,
    getActivePolicies,
    updateSecurityPolicy,
    initializeSecurityPolicies,
    getClientIP,
} from '../services/security.js';
import {
    addGeoBlock,
    removeGeoBlock,
    listGeoBlocks,
    ALL_COUNTRIES,
    HIGH_RISK_COUNTRIES,
    getGeoFromIP,
} from '../services/geoblock.js';
import { PrismaClient, Role } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Require SuperAdmin role
const requireRole = (role: Role) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.role !== role) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        (req as any).user = user;
        next();
    };
};

// All routes require SuperAdmin
router.use(authenticate);
router.use(requireRole('SUPERADMIN'));

// ============================================
// SECURITY POLICIES
// ============================================

/**
 * GET /admin/security/policies
 * List all security policies
 */
router.get('/policies', async (req: Request, res: Response) => {
    try {
        const policies = await prisma.platformSecurityPolicy.findMany({
            orderBy: { type: 'asc' },
        });
        res.json(policies);
    } catch (error) {
        console.error('Failed to list policies:', error);
        res.status(500).json({ error: 'Failed to list security policies' });
    }
});

/**
 * POST /admin/security/policies/initialize
 * Initialize default security policies
 */
router.post('/policies/initialize', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        await initializeSecurityPolicies(userId);

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'initialize_policies' },
            severity: 'LOW',
        });

        res.json({ success: true, message: 'Security policies initialized' });
    } catch (error) {
        console.error('Failed to initialize policies:', error);
        res.status(500).json({ error: 'Failed to initialize security policies' });
    }
});

/**
 * PUT /admin/security/policies/:id
 * Update a security policy
 */
router.put('/policies/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive, config } = req.body;
        const userId = (req as any).user?.id;

        const updated = await updateSecurityPolicy(id, { isActive, config });

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'update_policy', policyId: id, changes: { isActive, config } },
            severity: 'MEDIUM',
        });

        res.json(updated);
    } catch (error) {
        console.error('Failed to update policy:', error);
        res.status(500).json({ error: 'Failed to update security policy' });
    }
});

// ============================================
// GEO-BLOCKING (Platform Level)
// ============================================

/**
 * GET /admin/security/geo-blocks
 * List platform-wide geo-blocks
 */
router.get('/geo-blocks', async (req: Request, res: Response) => {
    try {
        const blocks = await listGeoBlocks(null); // null = platform-wide
        res.json(blocks);
    } catch (error) {
        console.error('Failed to list geo-blocks:', error);
        res.status(500).json({ error: 'Failed to list geo-blocks' });
    }
});

/**
 * POST /admin/security/geo-blocks
 * Add a platform-wide geo-block
 */
router.post('/geo-blocks', async (req: Request, res: Response) => {
    try {
        const { countryCode, countryName, reason, blockType, expiresAt } = req.body;
        const userId = (req as any).user?.id;

        if (!countryCode || !countryName) {
            return res.status(400).json({ error: 'Country code and name are required' });
        }

        const block = await addGeoBlock({
            countryCode,
            countryName,
            reason,
            blockType,
            createdById: userId,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'add_geo_block', countryCode, countryName },
            severity: 'HIGH',
        });

        res.status(201).json(block);
    } catch (error) {
        console.error('Failed to add geo-block:', error);
        res.status(500).json({ error: 'Failed to add geo-block' });
    }
});

/**
 * DELETE /admin/security/geo-blocks/:id
 * Remove a geo-block
 */
router.delete('/geo-blocks/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        await removeGeoBlock(id);

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'remove_geo_block', blockId: id },
            severity: 'MEDIUM',
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to remove geo-block:', error);
        res.status(500).json({ error: 'Failed to remove geo-block' });
    }
});

/**
 * GET /admin/security/countries
 * Get list of countries for UI
 */
router.get('/countries', (req: Request, res: Response) => {
    res.json({
        allCountries: ALL_COUNTRIES,
        highRiskCountries: HIGH_RISK_COUNTRIES,
    });
});

// ============================================
// IP BLOCKING
// ============================================

/**
 * GET /admin/security/blocked-ips
 * List all blocked IPs
 */
router.get('/blocked-ips', async (req: Request, res: Response) => {
    try {
        const ips = await listBlockedIPs();
        res.json(ips);
    } catch (error) {
        console.error('Failed to list blocked IPs:', error);
        res.status(500).json({ error: 'Failed to list blocked IPs' });
    }
});

/**
 * POST /admin/security/blocked-ips
 * Block an IP address
 */
router.post('/blocked-ips', async (req: Request, res: Response) => {
    try {
        const { ipAddress, reason, threatLevel, expiresAt } = req.body;
        const userId = (req as any).user?.id;

        if (!ipAddress) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        const block = await blockIP({
            ipAddress,
            reason,
            threatLevel,
            source: 'manual',
            createdById: userId,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'block_ip', blockedIP: ipAddress, reason },
            severity: 'HIGH',
        });

        res.status(201).json(block);
    } catch (error) {
        console.error('Failed to block IP:', error);
        res.status(500).json({ error: 'Failed to block IP' });
    }
});

/**
 * DELETE /admin/security/blocked-ips/:ip
 * Unblock an IP address
 */
router.delete('/blocked-ips/:ip', async (req: Request, res: Response) => {
    try {
        const { ip } = req.params;
        const userId = (req as any).user?.id;

        await unblockIP(ip);

        await logSecurityEvent({
            action: SecurityEvents.ADMIN_ACTION,
            userId,
            ipAddress: getClientIP(req),
            details: { action: 'unblock_ip', unblockedIP: ip },
            severity: 'MEDIUM',
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to unblock IP:', error);
        res.status(500).json({ error: 'Failed to unblock IP' });
    }
});

// ============================================
// AUDIT LOG
// ============================================

/**
 * GET /admin/security/audit-log
 * Get security audit log entries
 */
router.get('/audit-log', async (req: Request, res: Response) => {
    try {
        const {
            action,
            severity,
            limit = '50',
            offset = '0',
        } = req.query;

        const entries = await prisma.securityAuditLog.findMany({
            where: {
                ...(action ? { action: action as string } : {}),
                ...(severity ? { severity: severity as any } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        const total = await prisma.securityAuditLog.count({
            where: {
                ...(action ? { action: action as string } : {}),
                ...(severity ? { severity: severity as any } : {}),
            },
        });

        res.json({ entries, total });
    } catch (error) {
        console.error('Failed to get audit log:', error);
        res.status(500).json({ error: 'Failed to get audit log' });
    }
});

/**
 * GET /admin/security/lookup/:ip
 * Look up geolocation for an IP
 */
router.get('/lookup/:ip', (req: Request, res: Response) => {
    const { ip } = req.params;
    const geo = getGeoFromIP(ip);
    res.json(geo);
});

export default router;
