export function validateLoginInput(email: string, password: string): string | null {
  if (!email || !password) {
    return "E-mail a heslo jsou povinné údaje.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Zadejte platný formát e-mailové adresy.";
  }

  if (password.length < 6) {
    return "Heslo musí obsahovat alespoň 6 znaků.";
  }

  return null;
}

