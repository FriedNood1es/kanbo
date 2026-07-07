// Throwaway demo accounts are marked by their email domain rather than a
// schema flag, so spinning one up needs no migration. A future cleanup job
// can delete users whose email ends in this domain (the cascade takes their
// applications with them) — see IMPROVEMENTS.md.
export const DEMO_EMAIL_DOMAIN = "demo.kanbo.local";

export function isDemoEmail(email: string | null | undefined): boolean {
  return email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`) ?? false;
}
