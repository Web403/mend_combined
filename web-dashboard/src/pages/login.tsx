import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, LogIn } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { User } from "@/types/lms";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Interceptor already unwraps { success, message, data } → this IS the data object
      const data = await api.post<any, any>("/auth/login", { email, password });

      if (data?.accessToken) {
        const user: User = {
          id: data.userId || data.id || "",
          userId: data.userId,
          name: data.username || data.name || email.split("@")[0],
          username: data.username,
          email: data.email,
          phone: data.phone,
          role: data.role,
          roles: data.roles,
          hotelId: data.hotelId,
          userSecretId: data.userSecretId,
          departmentType: data.departmentType,
          departmentRole: data.departmentRole,
        };

        setAuth(user, data.accessToken, data.refreshToken || null, data.hotelId);
        toast.success(`Welcome, ${user.name}`);
        navigate("/");
      } else {
        toast.error("Login failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Library className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Mend LMS</h1>
          <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your email and password to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="h-4 w-4 mr-2" />
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}