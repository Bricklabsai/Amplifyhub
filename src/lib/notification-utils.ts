/** Dedupe keys use `dedupe:` prefix; real navigation links start with `/`. */
export function isNavigableNotificationLink(link: string | null | undefined): boolean {
  return Boolean(link && link.startsWith("/"));
}
