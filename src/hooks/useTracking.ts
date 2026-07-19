import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function getSessionId() {
  let sessionId = sessionStorage.getItem('spotclm_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('spotclm_session_id', sessionId);
  }
  return sessionId;
}

export function useTracking() {
  const location = useLocation();
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    // Generate or get session ID
    const sessionId = getSessionId();

    // Prevent tracking on admin panel
    if (window.location.hostname.startsWith('admin.')) return;

    // Fire fire-and-forget page view event
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType: 'page_view',
        page: location.pathname,
        durationMs: Date.now() - sessionStartTime,
      }),
    }).catch(() => { /* ignore */ });

  }, [location.pathname, sessionStartTime]);
}
