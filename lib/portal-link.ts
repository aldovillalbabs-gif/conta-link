export const PORTAL_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://conta-link.vercel.app";

export function buildPortalUrl(slug: string, token: string): string {
  return `${PORTAL_BASE_URL}/portal/${slug}?token=${token}`;
}
