/**
 * Calculates distance in meters between two geographical coordinates (latitude & longitude)
 * using the Haversine formula.
 */
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Checks whether user coordinates are within maxDistanceMeters of restaurant location.
 */
const isWithinGeofence = (userLat, userLon, restLat, restLon, maxDistanceMeters = 100) => {
  if (!userLat || !userLon || !restLat || !restLon) return true;
  const distance = calculateDistanceMeters(userLat, userLon, restLat, restLon);
  return distance <= maxDistanceMeters;
};

module.exports = { calculateDistanceMeters, isWithinGeofence };
