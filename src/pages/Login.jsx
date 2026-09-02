import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Input, Button, Logo } from "@/components/ui";

export function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid login credentials.");
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)] px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Logo size={44} showText={true} />
          <h1 className="mt-6 text-xl font-bold tracking-tight text-[var(--color-app-text)]">
            Welcome to Stockly
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-app-text-muted)]">
            Sign in to access your inventory and sales dashboard
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-[var(--color-app-danger)] bg-[var(--color-app-danger-muted)] px-4 py-3 text-sm font-medium text-[var(--color-app-danger)]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="admin@stockly.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={isSubmitting}
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
