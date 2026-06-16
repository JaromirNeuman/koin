export const REQUIREMENTS = [
  {
    id: "length",
    label: "Alespoň 8 znaků",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "Velké písmeno",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "Malé písmeno",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "number", label: "Číslo", test: (p: string) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "Speciální znak (!@#$…)",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
] as const;

export function getStrength(password: string): number {
  return REQUIREMENTS.filter((r) => r.test(password)).length;
}

export function validateRegisterInput(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): string | null {
  if (!name || !email || !password || !confirmPassword) {
    return "Vyplňte prosím všechna pole.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Zadejte platný formát e-mailové adresy.";
  }

  if (getStrength(password) < REQUIREMENTS.length) {
    return "Heslo nesplňuje všechny požadavky na bezpečnost.";
  }

  if (password !== confirmPassword) {
    return "Zadaná hesla se neshodují.";
  }

  return null;
}