import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getLoginRedirectPath } from "@/lib/routes";
import { getStoredUser } from "@/lib/auth";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: Location })?.from?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    const redirectPath = getLoginRedirectPath(
      fromPath,
      user.roles,
      user.canApproveSubcontracts,
    );
    navigate(redirectPath, { replace: true });
  }, [fromPath, navigate, user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      const storedUser = getStoredUser();
      const redirectPath = getLoginRedirectPath(
        fromPath,
        storedUser?.roles,
        storedUser?.canApproveSubcontracts,
      );
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Не удалось войти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md p-6 shadow-medium">
        <h1 className="text-2xl font-bold text-foreground">Вход</h1>
        <p className="text-muted-foreground mt-1">Используйте логин и пароль от администратора</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Логин (email)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@project.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting}
            onClick={() => handleSubmit()}
          >
            {isSubmitting ? "Вход..." : "Войти"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
