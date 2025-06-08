export const CROSSMINT_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_CROSSMINT_ENV === 'staging' 
    ? 'https://staging.crossmint.com'
    : 'https://www.crossmint.com',
}; 