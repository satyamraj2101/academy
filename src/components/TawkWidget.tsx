// SpotCLM — tawk.to Live Chat Widget
// Replaces the simulated LiveChatModal with a real live chat backed by tawk.to.
// 
// SETUP REQUIRED:
// 1. Sign up at https://tawk.to and create a property for spotclm.com
// 2. Replace TAWK_PROPERTY_ID and TAWK_WIDGET_ID below with your values from:
//    tawk.to Dashboard → Administration → Property Settings
// 3. In tawk.to Dashboard → Pre-Chat Form: enable Name + Email fields
// 4. Set tawk.to webhook URL to: https://spotclm.com/api/webhooks/tawkto

import { useRef, useEffect } from 'react';

// ─── UPDATE THESE WITH YOUR TAWK.TO IDs ─────────────────────────────────────
const TAWK_PROPERTY_ID: string = '6a421d277f4a851d4a3fdab9';   // e.g. 6123abc4def567890
const TAWK_WIDGET_ID = '1js943pdq';         // e.g. 1f2g3h4i5
// ────────────────────────────────────────────────────────────────────────────

interface TawkWidgetProps {
  /** If user email is known (e.g. after form submit), pass it to identify them in tawk.to */
  userEmail?: string;
  /** If user name is known, pass it for identification */
  userName?: string;
  /** Whether the widget should be visible */
  visible?: boolean;
}

declare global {
  interface Window {
    Tawk_API?: {
      setAttributes?: (attrs: Record<string, string>, cb?: (error: unknown) => void) => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      onLoad?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

export function TawkWidget({ userEmail, userName, visible = true }: TawkWidgetProps) {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Skip if already loaded or IDs not configured
    if (scriptLoaded.current) return;
    if (TAWK_PROPERTY_ID === 'YOUR_TAWK_PROPERTY_ID') {
      console.warn('[TawkWidget] Please set TAWK_PROPERTY_ID and TAWK_WIDGET_ID in TawkWidget.tsx');
      return;
    }

    scriptLoaded.current = true;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Insert the tawk.to script
    // data-cfasync="false" exempts this from Cloudflare Rocket Loader,
    // which breaks tawk.to's internal i18next initialization order.
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.setAttribute('data-cfasync', 'false');
    document.head.appendChild(script);

    return () => {
      // Note: tawk.to script cleanup is not needed as it manages its own lifecycle
    };
  }, []);

  // Set user attributes when email/name becomes available
  useEffect(() => {
    if (!userEmail || !window.Tawk_API?.setAttributes) return;

    const attrs: Record<string, string> = {};
    if (userEmail) attrs.email = userEmail;
    if (userName) attrs.name = userName;

    window.Tawk_API.setAttributes(attrs, (error) => {
      if (error) console.warn('[TawkWidget] setAttributes error:', error);
    });
  }, [userEmail, userName]);

  // Toggle widget visibility
  useEffect(() => {
    if (!window.Tawk_API) return;
    if (visible) {
      window.Tawk_API.showWidget?.();
    } else {
      window.Tawk_API.hideWidget?.();
    }
  }, [visible]);

  // This component renders nothing — tawk.to injects its own floating button
  return null;
}

/**
 * Programmatically open the tawk.to chat window.
 * Call this when user clicks a "Chat with us" button.
 */
export function openTawkChat() {
  if (window.Tawk_API?.maximize) {
    window.Tawk_API.maximize();
  } else {
    // Widget not loaded yet — it will auto-appear
    console.warn('[TawkWidget] Tawk_API not ready yet');
  }
}
