import { useAuthStore } from "@/store/auth";
import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/types/lms";

export function Header() {
  const { user, activeRole, setActiveRole } = useAuthStore();
  const navigate = useNavigate();
  if (!user) return null;
  const role = activeRole ?? user.role;

  const switchPanel = (nextRole: Role) => {
    setActiveRole(nextRole);
    navigate("/");
  };
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3 max-w-md flex-1">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses, learners, content…" className="border-0 shadow-none focus-visible:ring-0" />
      </div>
      <div className="flex items-center gap-3">
        <Select value={role} onValueChange={(value) => switchPanel(value as Role)}>
          <SelectTrigger className="h-8 w-32 capitalize" aria-label="Switch panel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
