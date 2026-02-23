import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    switch (role) {
      case "ADMIN":
        navigate("/admin", { replace: true });
        break;
      case "SOCIO":
        navigate("/socio", { replace: true });
        break;
      case "BECARIO":
        navigate("/checkin", { replace: true });
        break;
      default:
        // Role not loaded yet, wait
        break;
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
