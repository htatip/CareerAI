export function parseAIJson(raw) {
  if (!raw) return null;

  // Already a parsed object — return directly
  if (typeof raw === "object") return raw;

  // Strip markdown code fences
  let cleaned = raw.replace(/```json|```/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Extract first { ... } block (handles extra explanation text after JSON)
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (_) {}
  }

  // Extract first [ ... ] array block
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (_) {}
  }

  // Last resort — return raw string wrapped so the UI doesn't crash
  return { raw: cleaned };
}