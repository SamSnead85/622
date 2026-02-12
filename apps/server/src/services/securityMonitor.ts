/**
 * SECURITY MONITORING SERVICE
 * Detects anomalous behavior and triggers alerts for potential threats.
 * 
 * Monitors:
 * - Rapid account creation (bot detection)
 * - Geographic anomalies (login from new country)
 * - Credential stuffing patterns
 * - API abuse patterns
 * - Privilege escalation attempts
 */

import { cache } from './cache/RedisCache.js';
import { logger } from '../utils/logger.js';
import { sendAlert, type AlertSeverity } from './alerting.js';

// ============================================
// THRESHOLDS
// ============================================

const THRESHOLDS = {
    // Max signups from same IP in 1 hour
    SIGNUP_PER_IP_HOUR: 3,
    // Max failed logins from same IP in 15 minutes
    FAILED_LOGIN_PER_IP: 10,
    // Max password reset requests from same IP in 1 hour
    RESET_PER_IP_HOUR: 5,
    // Max API requests from same user in 1 minute (beyond normal rate limit)
    API_ABUSE_PER_MINUTE: 200,
    // Max different user agents from same IP in 1 hour
    USER_AGENT_DIVERSITY: 10,
};

// ============================================
// THREAT DETECTION
// ============================================

export interface ThreatEvent {
    type: 'bot_signup' | 'credential_stuffing' | 'api_abuse' | 'geo_anomaly' | 'privilege_escalation' | 'brute_force' | 'token_abuse';
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip: string;
    userId?: string;
    details: Record<string, any>;
    timestamp: Date;
}

const threatLog: ThreatEvent[] = [];
const MAX_THREAT_LOG = 1000;

/**
 * Record a threat event and send alert
 */
function recordThreat(event: ThreatEvent) {
    threatLog.push(event);
    if (threatLog.length > MAX_THREAT_LOG) {
        threatLog.splice(0, threatLog.length - MAX_THREAT_LOG);
    }

    const prefix = event.severity === 'critical' ? '🚨 CRITICAL' :
                   event.severity === 'high' ? '⚠️  HIGH' :
                   event.severity === 'medium' ? '🔶 MEDIUM' : '🔵 LOW';

    logger.warn(`[SECURITY] ${prefix} THREAT: ${event.type} from IP ${event.ip}${event.userId ? ` (user: ${event.userId})` : ''} — ${JSON.stringify(event.details)}`);

    // Send alert for medium+ severity threats
    const severityMap: Record<string, AlertSeverity> = {
        low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
    };
    sendAlert({
        severity: severityMap[event.severity] || 'MEDIUM',
        eventType: event.type.toUpperCase(),
        message: `Threat detected: ${event.type} from IP ${event.ip}`,
        details: event.details,
        ip: event.ip,
        userId: event.userId,
    }).catch(() => {}); // Non-blocking
}

/**
 * Track signup attempts per IP for bot detection
 */
export async function trackSignup(ip: string): Promise<{ allowed: boolean; threat?: ThreatEvent }> {
    const key = `security:signup:${ip}`;
    const ttl = 3600; // 1 hour

    try {
        const count = await cache.increment(key, ttl);
        if (count > THRESHOLDS.SIGNUP_PER_IP_HOUR) {
            const threat: ThreatEvent = {
                type: 'bot_signup',
                severity: count > THRESHOLDS.SIGNUP_PER_IP_HOUR * 3 ? 'high' : 'medium',
                ip,
                details: { signupCount: count, window: '1 hour' },
                timestamp: new Date(),
            };
            recordThreat(threat);
            return { allowed: false, threat };
        }
    } catch {
        // Redis unavailable — allow but log
    }
    return { allowed: true };
}

/**
 * Track failed logins per IP for credential stuffing detection
 */
export async function trackFailedLogin(ip: string, email: string): Promise<{ threat?: ThreatEvent }> {
    const ipKey = `security:failed_login_ip:${ip}`;
    const ttl = 900; // 15 minutes

    try {
        const count = await cache.increment(ipKey, ttl);
        if (count > THRESHOLDS.FAILED_LOGIN_PER_IP) {
            const threat: ThreatEvent = {
                type: 'credential_stuffing',
                severity: count > THRESHOLDS.FAILED_LOGIN_PER_IP * 2 ? 'critical' : 'high',
                ip,
                details: { failedAttempts: count, lastEmail: email.substring(0, 3) + '***', window: '15 min' },
                timestamp: new Date(),
            };
            recordThreat(threat);
            return { threat };
        }
    } catch {
        // Redis unavailable
    }
    return {};
}

/**
 * Track password reset requests for abuse detection
 */
export async function trackPasswordReset(ip: string): Promise<{ allowed: boolean; threat?: ThreatEvent }> {
    const key = `security:reset:${ip}`;
    const ttl = 3600; // 1 hour

    try {
        const count = await cache.increment(key, ttl);
        if (count > THRESHOLDS.RESET_PER_IP_HOUR) {
            const threat: ThreatEvent = {
                type: 'brute_force',
                severity: 'medium',
                ip,
                details: { resetRequests: count, window: '1 hour' },
                timestamp: new Date(),
            };
            recordThreat(threat);
            return { allowed: false, threat };
        }
    } catch {
        // Redis unavailable
    }
    return { allowed: true };
}

/**
 * Detect geographic anomaly (login from unexpected location)
 */
export async function checkGeoAnomaly(
    userId: string,
    ip: string,
    country: string
): Promise<{ anomaly: boolean; threat?: ThreatEvent }> {
    const key = `security:geo:${userId}`;

    try {
        const knownCountries = await cache.get<string[]>(key);
        if (knownCountries && knownCountries.length > 0 && !knownCountries.includes(country)) {
            const threat: ThreatEvent = {
                type: 'geo_anomaly',
                severity: 'medium',
                ip,
                userId,
                details: { newCountry: country, knownCountries },
                timestamp: new Date(),
            };
            recordThreat(threat);

            // Add the new country to known list
            await cache.set(key, [...knownCountries, country], 30 * 24 * 3600); // 30 days
            return { anomaly: true, threat };
        }

        // Initialize or update known countries
        const countries = knownCountries || [];
        if (!countries.includes(country)) {
            countries.push(country);
            await cache.set(key, countries, 30 * 24 * 3600);
        }
    } catch {
        // Redis unavailable
    }
    return { anomaly: false };
}

/**
 * Track user agent diversity per IP (bot detection)
 */
export async function trackUserAgent(ip: string, userAgent: string): Promise<{ suspicious: boolean }> {
    const key = `security:ua:${ip}`;
    const ttl = 3600; // 1 hour

    try {
        const agents = await cache.get<string[]>(key) || [];
        const shortUA = userAgent.substring(0, 100); // Truncate for storage

        if (!agents.includes(shortUA)) {
            agents.push(shortUA);
            await cache.set(key, agents, ttl);

            if (agents.length > THRESHOLDS.USER_AGENT_DIVERSITY) {
                const threat: ThreatEvent = {
                    type: 'bot_signup',
                    severity: 'medium',
                    ip,
                    details: { uniqueUserAgents: agents.length, window: '1 hour' },
                    timestamp: new Date(),
                };
                recordThreat(threat);
                return { suspicious: true };
            }
        }
    } catch {
        // Redis unavailable
    }
    return { suspicious: false };
}

/**
 * Get recent threat events (for admin dashboard)
 */
export function getRecentThreats(limit: number = 50): ThreatEvent[] {
    return threatLog.slice(-limit).reverse();
}

/**
 * Get threat summary statistics
 */
export function getThreatSummary(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    last24h: number;
} {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let last24h = 0;

    for (const event of threatLog) {
        bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
        byType[event.type] = (byType[event.type] || 0) + 1;
        if (event.timestamp.getTime() > oneDayAgo) last24h++;
    }

    return { total: threatLog.length, bySeverity, byType, last24h };
}
