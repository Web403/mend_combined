import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  Library,
  FileQuestion,
  Users,
  Award,
  GraduationCap,
  PlayCircle,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/types/lms";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "EMPLOYEE", "instructor", "learner"] },
  { to: "/categories", label: "Categories", icon: FolderTree, roles: ["admin"] },
  { to: "/courses", label: "Courses", icon: BookOpen, roles: ["admin", "EMPLOYEE", "instructor", "learner"] },
  { to: "/enrollments", label: "Enrollments", icon: Users, roles: ["admin", "EMPLOYEE", "learner"] },
  { to: "/my-learning", label: "My Learning", icon: GraduationCap, roles: ["EMPLOYEE", "learner"] },
  { to: "/certificates", label: "Certificates", icon: Award, roles: ["admin", "EMPLOYEE", "learner"] },
];

export function Sidebar() {
  const { user, activeRole, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;
  const role = activeRole ?? user.role;
  const items = NAV.filter((i) => i.roles.includes(role));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Library className="h-6 w-6 mr-2 text-primary" />
        <div>
          <div className="font-semibold text-sm">Mend LMS</div>
          <div className="text-xs text-muted-foreground capitalize">{role} Console</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
