export function getApiUrl(): string {
  return import.meta.env.PROD ? '' : 'http://localhost:8080';
}
