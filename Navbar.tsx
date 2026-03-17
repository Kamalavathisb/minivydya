import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (user) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/dashboard" className="text-primary font-bold text-lg">
            Medical Report Advisor
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
            <Link to="/reports" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Reports</Link>
            <Link to="/metrics" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Metrics</Link>
            <Link to="/recommendations" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Recommendations</Link>
            <Link to="/upload" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Upload</Link>
            <span className="text-sm text-muted-foreground">Hi, {profile?.full_name || user.email}</span>
            <Button variant="destructive" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="text-primary font-bold text-lg">
          Medical Report Advisor
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Login</Link>
          <Button asChild size="sm">
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
