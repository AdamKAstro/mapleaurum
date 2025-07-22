// src/services/promo-tracking-service.ts
import { supabase } from '../lib/supabaseClient';

interface TrackingData {
  promo_code: string;
  promo_type: 'stripe_coupon' | 'app_trial';
  action_type: 'viewed' | 'clicked' | 'activated' | 'failed' | 'expired';
  user_id?: string;
  user_email?: string;
  source_url?: string;
  metadata?: Record<string, any>;
}

interface BrowserInfo {
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  user_agent: string;
}

export class PromoTrackingService {
  private static sessionId: string = this.generateSessionId();
  
  /**
   * Generate a unique session ID for tracking user journey
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse user agent to get browser and OS info
   */
  private static getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    
    // Detect browser
    let browser_name = 'Unknown';
    let browser_version = 'Unknown';
    
    if (ua.includes('Firefox/')) {
      browser_name = 'Firefox';
      browser_version = ua.split('Firefox/')[1].split(' ')[0];
    } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
      browser_name = 'Chrome';
      browser_version = ua.split('Chrome/')[1].split(' ')[0];
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      browser_name = 'Safari';
      browser_version = ua.split('Version/')[1]?.split(' ')[0] || 'Unknown';
    } else if (ua.includes('Edg/')) {
      browser_name = 'Edge';
      browser_version = ua.split('Edg/')[1].split(' ')[0];
    }
    
    // Detect OS
    let os_name = 'Unknown';
    let os_version = 'Unknown';
    
    if (platform.startsWith('Win')) {
      os_name = 'Windows';
      if (ua.includes('Windows NT 10.0')) os_version = '10';
      else if (ua.includes('Windows NT 11.0')) os_version = '11';
    } else if (platform.startsWith('Mac')) {
      os_name = 'macOS';
      const match = ua.match(/Mac OS X ([\d_]+)/);
      if (match) os_version = match[1].replace(/_/g, '.');
    } else if (platform === 'Linux') {
      os_name = 'Linux';
    } else if (/Android/.test(ua)) {
      os_name = 'Android';
      const match = ua.match(/Android ([\d.]+)/);
      if (match) os_version = match[1];
    } else if (/iPhone|iPad|iPod/.test(ua)) {
      os_name = 'iOS';
      const match = ua.match(/OS ([\d_]+)/);
      if (match) os_version = match[1].replace(/_/g, '.');
    }
    
    // Detect device type
    let device_type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|Android|iPhone/.test(ua) && !/iPad|Tablet/.test(ua)) {
      device_type = 'mobile';
    } else if (/iPad|Tablet|PlayBook/.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'))) {
      device_type = 'tablet';
    }
    
    return {
      browser_name,
      browser_version,
      os_name,
      os_version,
      device_type,
      user_agent: ua
    };
  }

  /**
   * Parse URL parameters for UTM and other tracking data
   */
  private static parseUrlParams(url: string): Record<string, string> {
    const params = new URLSearchParams(new URL(url).search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      referrer: document.referrer || ''
    };
  }

  /**
   * Get user's approximate location from timezone (privacy-friendly)
   */
  private static getLocationFromTimezone(): { country_code: string; region: string } {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Basic timezone to country mapping (you can expand this)
      const tzToCountry: Record<string, { country_code: string; region: string }> = {
        'America/New_York': { country_code: 'US', region: 'Eastern' },
        'America/Chicago': { country_code: 'US', region: 'Central' },
        'America/Denver': { country_code: 'US', region: 'Mountain' },
        'America/Los_Angeles': { country_code: 'US', region: 'Pacific' },
        'Europe/London': { country_code: 'GB', region: 'London' },
        'Europe/Paris': { country_code: 'FR', region: 'Paris' },
        'Asia/Tokyo': { country_code: 'JP', region: 'Tokyo' },
        'Australia/Sydney': { country_code: 'AU', region: 'Sydney' },
        'Australia/Perth': { country_code: 'AU', region: 'Perth' },
        // Add more as needed
      };
      
      return tzToCountry[tz] || { country_code: 'Unknown', region: 'Unknown' };
    } catch {
      return { country_code: 'Unknown', region: 'Unknown' };
    }
  }

  /**
   * Track a promo code action (invisible to user)
   */
  static async trackAction(data: TrackingData): Promise<void> {
    try {
      // Don't track if it's a development environment
      if (window.location.hostname === 'localhost') {
        console.log('[PromoTracking] Skipping tracking in development');
        return;
      }

      const browserInfo = this.getBrowserInfo();
      const urlParams = this.parseUrlParams(window.location.href);
      const location = this.getLocationFromTimezone();
      
      // Build tracking payload
      const trackingPayload = {
        ...data,
        ...browserInfo,
        ...urlParams,
        ...location,
        source_url: window.location.href,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      };

      // Call edge function to track (server-side for security)
      await supabase.functions.invoke('track-promo-code', {
        body: trackingPayload
      });

      // Also track session event
      await this.trackSessionEvent({
        promo_code: data.promo_code,
        event_type: data.action_type,
        event_data: data.metadata || {}
      });

    } catch (error) {
      // Silently fail - never show tracking errors to users
      console.error('[PromoTracking] Silent error:', error);
    }
  }

  /**
   * Track session events for user journey analysis
   */
  private static async trackSessionEvent(data: {
    promo_code: string;
    event_type: string;
    event_data: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.functions.invoke('track-promo-session', {
        body: {
          session_id: this.sessionId,
          ...data
        }
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Track when a promo link is viewed (page load)
   */
  static async trackView(promo_code: string, promo_type: 'stripe_coupon' | 'app_trial'): Promise<void> {
    await this.trackAction({
      promo_code,
      promo_type,
      action_type: 'viewed',
      metadata: {
        page_load_time: performance.now(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        color_depth: window.screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });
  }

  /**
   * Track when a promo button is clicked
   */
  static async trackClick(
    promo_code: string, 
    promo_type: 'stripe_coupon' | 'app_trial',
    user_id?: string,
    user_email?: string
  ): Promise<void> {
    await this.trackAction({
      promo_code,
      promo_type,
      action_type: 'clicked',
      user_id,
      user_email,
      metadata: {
        time_on_page: performance.now(),
        click_position: { x: 0, y: 0 }, // You can add actual click coordinates if needed
        plan_selected: new URLSearchParams(window.location.search).get('plan')
      }
    });
  }

  /**
   * Track successful activation
   */
  static async trackActivation(
    promo_code: string,
    promo_type: 'stripe_coupon' | 'app_trial',
    user_id: string,
    user_email: string,
    subscription_id?: string,
    revenue_amount?: number
  ): Promise<void> {
    await this.trackAction({
      promo_code,
      promo_type,
      action_type: 'activated',
      user_id,
      user_email,
      metadata: {
        subscription_id,
        revenue_amount,
        activation_time: new Date().toISOString(),
        total_time_to_convert: performance.now()
      }
    });
  }

  /**
   * Track failed activation attempts
   */
  static async trackFailure(
    promo_code: string,
    promo_type: 'stripe_coupon' | 'app_trial',
    error_message: string,
    user_id?: string,
    user_email?: string
  ): Promise<void> {
    await this.trackAction({
      promo_code,
      promo_type,
      action_type: 'failed',
      user_id,
      user_email,
      metadata: {
        error_message,
        failure_time: new Date().toISOString(),
        retry_count: sessionStorage.getItem(`promo_retry_${promo_code}`) || '0'
      }
    });
    
    // Increment retry count
    const currentRetries = parseInt(sessionStorage.getItem(`promo_retry_${promo_code}`) || '0');
    sessionStorage.setItem(`promo_retry_${promo_code}`, String(currentRetries + 1));
  }

  /**
   * Track when admin generates a link
   */
  static async trackLinkGeneration(
    promo_code: string,
    promo_type: 'stripe_coupon' | 'app_trial',
    admin_email: string,
    notes?: string
  ): Promise<void> {
    try {
      await supabase.functions.invoke('track-link-generation', {
        body: {
          promo_code,
          promo_type,
          generated_by: admin_email,
          full_link: window.location.origin + `/subscribe?promo_code=${promo_code}`,
          notes
        }
      });
    } catch {
      // Silent fail
    }
  }
}