"use client";

// Client-side Analytics dispatch engine
export function trackEvent(eventName: string, eventData: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  // 1. Post to internal analytics endpoint
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: eventName,
      eventData: {
        ...eventData,
        referrer: document.referrer,
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      }
    })
  }).catch((err) => {
    console.warn("Analytics internal log failed:", err);
  });

  // 2. Dispatch to GA4 (gtag.js) if available in production environment
  const w = window as any;
  if (typeof w.gtag === "function") {
    try {
      w.gtag("event", eventName, eventData);
    } catch (e) {
      console.warn("GA4 event tracking failed:", e);
    }
  }

  // 3. Dev-environment logging
  if (process.env.NODE_ENV === "development") {
    console.log(`[SmartPick Analytics] Event: ${eventName}`, eventData);
  }
}
