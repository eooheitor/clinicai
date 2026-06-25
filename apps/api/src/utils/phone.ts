export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-11);
}

// Um @lid (WhatsApp Privacy ID) não é um telefone real — seus dígitos não formam
// um número discável. Só consideramos utilizável um contactPhone sem domínio "@".
export function usableContactPhone(contactPhone: string): string | null {
  if (!contactPhone || contactPhone.includes("@")) return null;
  return contactPhone;
}
