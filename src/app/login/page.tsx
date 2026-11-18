import { AuthForm } from "@/components/auth-form";
import { isLocalDevMode } from "@/lib/env";

export default function LoginPage() {
  return <AuthForm mode="login" localDev={isLocalDevMode()} />;
}
