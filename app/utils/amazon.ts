/**
 * Extracts an Amazon ASIN from a URL or search query
 * @param input - The URL or search query to extract the ASIN from
 * @returns The extracted ASIN or null if not found
 */
export function extractAsin(input: string): string | null {
  // Try to match ASIN in URL pattern
  const urlPattern = /amazon\.(?:com|co\.uk|de|fr|it|es|ca|co\.jp|in|com\.mx|com\.br|com\.au)\/[^/]+\/([A-Z0-9]{10})(?:\/|\?|$)/;
  const urlMatch = input.match(urlPattern);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Try to match standalone ASIN pattern
  const asinPattern = /\b[A-Z0-9]{10}\b/;
  const asinMatch = input.match(asinPattern);
  if (asinMatch) {
    return asinMatch[0];
  }

  return null;
} 