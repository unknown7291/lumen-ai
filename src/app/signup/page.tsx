import { AuthForm } from "@/components/auth-form";
import { isLocalDevMode } from "@/lib/env";

export default function SignupPage() {
  return <AuthForm mode="signup" localDev={isLocalDevMode()} />;
}
