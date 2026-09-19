/**
 * DineSync AI Privacy-Friendly Event & Web Vitals Analytics Tracker
 */
class AnalyticsTracker {
  constructor() {
    this.initialized = true;
    this.events = [];
  }

  trackEvent(eventName, properties = {}) {
    const payload = {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
    };

    this.events.push(payload);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics Event]', payload);
    }
  }

  trackPageView(pageName) {
    this.trackEvent('page_view', { page: pageName || window.location.pathname });
  }

  trackOrderPlaced(orderId, totalAmount) {
    this.trackEvent('order_placed', { orderId, totalAmount });
  }

  trackReservationBooked(reservationId, guestCount) {
    this.trackEvent('reservation_booked', { reservationId, guestCount });
  }
}

export const analytics = new AnalyticsTracker();
export default analytics;
