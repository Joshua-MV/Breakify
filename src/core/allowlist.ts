import type { AllowlistRule } from "../shared/types";

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).href;
  } catch {
    return trimmed;
  }
}

export function isTabSelectedForBreak(tabId: number | undefined, selectedBreakTabIds: number[]): boolean {
  return typeof tabId === "number" && selectedBreakTabIds.includes(tabId);
}

export function matchesAllowlist(url: string | undefined, rules: AllowlistRule[]): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const href = parsed.href;

  return rules.some((rule) => {
    if (rule.type === "domain") {
      const domain = normalizeDomain(rule.value);
      return hostname === domain || hostname.endsWith(`.${domain}`);
    }

    const normalized = normalizeUrl(rule.value);
    return href.startsWith(normalized);
  });
}

export function createAllowlistRule(value: string, type: "domain" | "url" = "domain"): AllowlistRule {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type,
    value: type === "domain" ? normalizeDomain(value) : normalizeUrl(value),
    label: value.trim()
  };
}
