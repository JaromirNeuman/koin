import { type Metadata } from "next";
import { LoginView } from "./_components/login-view";

export const metadata: Metadata = {
  title: "Přihlášení – Koin",
};

export default function LoginPage() {
  return <LoginView />;
}
