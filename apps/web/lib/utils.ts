import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a Brazilian phone number for display. Accepts/keeps only digits internally. */
export function maskPhoneBR(value?: string | null): string {
  const d = (value ?? "").replace(/\D/g, "").slice(0, 13)
  if (!d) return ""
  let cc = ""
  let rest = d
  if (d.length > 11 && d.startsWith("55")) {
    cc = "55"
    rest = d.slice(2)
  }
  const ddd = rest.slice(0, 2)
  const num = rest.slice(2)
  let body: string
  if (rest.length <= 2) {
    body = `(${ddd}`
  } else {
    const firstLen = num.length > 8 ? 5 : 4
    const first = num.slice(0, firstLen)
    const last = num.slice(firstLen)
    body = `(${ddd}) ${first}${last ? `-${last}` : ""}`
  }
  return cc ? `+${cc} ${body}` : body
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
