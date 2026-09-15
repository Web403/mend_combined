import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { enrollmentsApi } from "@/services/lms";
import { useRole } from "@/hooks/use-role";
import type { Enrollment, EnrollmentStatus } from "@/types/lms";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT: any = {
  applied: "info",
  enrolled: "info",
  in_progress: "warning",
  completed: "success",
  dropped: "destructive",
};

export function EnrollmentsPage() {
  const navigate = useNavigate();
  const { can } = useRole();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    enrollmentsApi
      .myEnrollments(statusFilter as EnrollmentStatus, 1, 50)
      .then((res) => {
        setEnrollments(res.data);
        setTotal(res.total);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id: string) => {
    try {
      await enrollmentsApi.approve(id);
      toast.success("Approved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const drop = async (e: Enrollment) => {
    const courseId = typeof e.course === "object" ? e.course._id : e.course;
    if (!confirm("Drop this course?")) return;
    try {
      await enrollmentsApi.drop(courseId);
      toast.success("Course dropped");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = enrollments.filter((e) => {
    if (!search) return true;
    const c = typeof e.course === "object" ? e.course : null;
    return c?.title?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enrollments</h1>
        <p className="text-muted-foreground">Track and manage course enrollments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by course…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Enrollments ({filtered.length})</CardTitle>
          <CardDescription>
            {can(["admin"]) ? "System-wide view" : "Your enrollments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No enrollments found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => {
                const c = typeof e.course === "object" ? e.course : null;
                return (
                  <div
                    key={e._id}
                    onClick={() => c && navigate(`/courses/${c._id}`)}
                    className="flex items-center gap-3 p-3 border rounded hover:bg-accent cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-xl">
                      {c?.icon || "📘"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{c?.title || "Course"}</div>
                      <div className="text-xs text-muted-foreground">
                        Enrolled {formatDate(e.enrolledAt || e.createdAt)}
                        {e.completedAt && ` · Completed ${formatDate(e.completedAt)}`}
                      </div>
                    </div>
                    <div className="w-32 hidden sm:block">
                      <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                        <span>Progress</span>
                        <span>{e.progressPercentage}%</span>
                      </div>
                      <Progress value={e.progressPercentage} />
                    </div>
                    <Badge variant={STATUS_VARIANT[e.status]} className="capitalize w-28 justify-center">
                      {e.status.replace("_", " ")}
                    </Badge>
                    <div onClick={(ev) => ev.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c && (
                            <DropdownMenuItem onClick={() => navigate(`/courses/${c._id}`)}>
                              View Course
                            </DropdownMenuItem>
                          )}
                          {e.status === "applied" && can(["admin", "instructor"]) && (
                            <DropdownMenuItem onClick={() => approve(e._id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {e.status !== "completed" && e.status !== "dropped" && (
                            <DropdownMenuItem onClick={() => drop(e)} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" />
                              Drop Course
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
