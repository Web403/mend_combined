import { useAuthStore } from "@/store/auth";
import type { Role } from "@/types/lms";

export function useRole() {
  const { user, activeRole } = useAuthStore();
  const role = activeRole ?? user?.role;
  return {
    role,
    isAdmin: role === "admin",
    isInstructor: role === "instructor",
    isLearner: role === "EMPLOYEE" || role === "learner",
    can: (allowed: Role[]) => !!role && allowed.includes(role),
  };
}
