// Mirrors the API's naming rule for tags (TraceMyMoneyAPI normalize_tag_name):
// trim, collapse repeated spaces, upper-case ONLY the first letter. The server
// is the authority; this copy only lets the UI show "Will be saved as ..."
// and update the list instantly before the server answers.
export const TAG_NAME_MAX = 50;

export function normalizeTagName(raw) {
  const cleaned = String(raw ?? "").trim().split(/\s+/).filter(Boolean).join(" ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// One tag as the store keeps it: { title, value (id), count (entries using it) }.
export function mapApiTags(rawTags) {
  return (rawTags || [])
    .map((t) => ({ title: t.name, value: t.id, count: t.entry_count ?? 0 }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}
