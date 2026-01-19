// Super admin emails (comma-separated) from environment variable
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}