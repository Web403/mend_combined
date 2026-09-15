import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, CheckCircle2, PlayCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { enrollmentsApi } from "@/services/lms";
import type { Enrollment, EnrollmentStatus } from "@/types/lms";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT: any = {
  applied: "info",
  enrolled: "info",
  in_progress: "warning",
  completed: "success",
  dropped: "destructive",
};

export function MyLearningPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | EnrollmentStatus>("all");

  const load = () => {
    setLoading(true);
    enrollmentsApi
      .myEnrollments(tab === "all" ? undefined : (tab as EnrollmentStatus), 1, 50)
      .then((res) => setEnrollments(res.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tab]);

  const inProgress = enrollments.filter((e) => e.status === "in_progress");
  const completed = enrollments.filter((e) => e.status === "completed");
  const applied = enrollments.filter((e) => e.status === "applied");
  const enrolled = enrollments.filter((e) => e.status === "enrolled");

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-7 w-7" />
          My Learning
        </h1>
        <p className="text-muted-foreground">Your personal learning dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="In Progress" value={inProgress.length} icon={PlayCircle} />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle2} />
        <StatCard title="Pending Approval" value={applied.length} icon={BookOpen} />
        <StatCard title="Certificates" value={completed.length} icon={Award} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          <TabsTrigger value="applied">Applied</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No courses here yet.</p>
                <Button className="mt-3" onClick={() => navigate("/courses")}>
                  Browse courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {enrollments.map((e) => {
                const c = typeof e.course === "object" ? e.course : null;
                return (
                  <Card
                    key={e._id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => c && navigate(`/learn/${c._id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                          {c?.icon || "📘"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base">{c?.title || "Course"}</CardTitle>
                          <CardDescription>
                            {e.status === "completed" && e.completedAt
                              ? `Completed ${formatDate(e.completedAt)}`
                              : `Enrolled ${formatDate(e.enrolledAt || e.createdAt)}`}
                          </CardDescription>
                        </div>
                        <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                          {e.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{e.progressPercentage}%</span>
                        </div>
                        <Progress value={e.progressPercentage} />
                        {e.certificateIssuedAt && (
                          <div className="flex items-center gap-1 text-xs text-emerald-700">
                            <Award className="h-3 w-3" />
                            Certificate issued
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
