import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Local Brazilian digits (DDD + number), country code 55 stripped. */
export function localPhoneBR(value?: string | null): string {
  let d = (value ?? "").replace(/\D/g, "")
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2)
  return d.slice(0, 11)
}

/** Stored/E.164-ish value with Brazil country code (55) — applied behind the scenes. */
export function toStoredPhoneBR(value?: string | null): string {
  const local = localPhoneBR(value)
  return local ? `55${local}` : ""
}

/** Display mask for a Brazilian phone WITHOUT the country code: (11) 99999-9999. */
export function maskPhoneBR(value?: string | null): string {
  const d = localPhoneBR(value)
  if (!d) return ""
  const ddd = d.slice(0, 2)
  const num = d.slice(2)
  if (d.length <= 2) return `(${ddd}`
  const firstLen = num.length > 8 ? 5 : 4
  const first = num.slice(0, firstLen)
  const last = num.slice(firstLen)
  return `(${ddd}) ${first}${last ? `-${last}` : ""}`
}

/** Two-letter initials from a name or phone, for avatars. */
export function getInitials(value?: string | null): string {
  if (!value) return "?"
  const clean = value.trim()
  if (!clean) return "?"
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}
