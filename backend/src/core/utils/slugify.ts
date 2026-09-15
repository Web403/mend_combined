export function slugify(value: string, options?: { lower?: boolean; strict?: boolean }): string {
  const source = value?.toString().trim() ?? "";
  const normalized = options?.lower === false ? source : source.toLowerCase();
  const slug = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return options?.strict === false ? slug.replace(/-+/g, "-") : slug;
}

export default slugify;
