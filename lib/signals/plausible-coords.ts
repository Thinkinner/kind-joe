/**
 * Reject coordinates that are placeholders (0,0 / Null Island) or out of range.
 * Unknown geo should use null in DB/UI, not numeric zero.
 */
export function hasPlausibleLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}
