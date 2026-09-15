import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, Users, Award, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useRole } from "@/hooks/use-role";
import { coursesApi, enrollmentsApi } from "@/services/lms";
import { formatDate } from "@/lib/utils";
import type { Course, Enrollment, EnrollmentStatus } from "@/types/lms";

const STATUS_VARIANT: Record<EnrollmentStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline"> = {
  applied: "info",
  enrolled: "info",
  in_progress: "warning",
  completed: "success",
  dropped: "destructive",
};

export function DashboardPage() {
  const { user } = useAuthStore();
  const { role, isLearner } = useRole();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 6, status: "published" as any }).catch(() => ({ data: [], total: 0 })),
      user ? enrollmentsApi.myEnrollments(undefined, 1, 6).catch(() => ({ data: [], total: 0 })) : Promise.resolve({ data: [], total: 0 }),
    ]).then(([c, e]) => {
      // Handle both wrapped and unwrapped response formats
      const coursesData = Array.isArray(c.data) ? c.data : (Array.isArray(c) ? c : []);
      const enrollmentsData = Array.isArray(e.data) ? e.data : (Array.isArray(e) ? e : []);
      
      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setLoading(false);
    });
  }, [user]);

  const inProgress = enrollments.filter((e) => e.status === "in_progress");
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-muted-foreground">
          {role === "admin" && "Here's what's happening in your learning program."}
          {role === "instructor" && "Manage the courses and content you've created."}
          {isLearner && "Continue your learning journey."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={isLearner ? "Enrolled Courses" : "Published Courses"}
          value={isLearner ? enrollments.length : courses.length}
          icon={BookOpen}
        />
        <StatCard
          title="In Progress"
          value={inProgress.length}
          icon={GraduationCap}
        />
        <StatCard
          title="Completed"
          value={completed.length}
          icon={CheckCircle2}
        />
        <StatCard
          title="Certificates"
          value={completed.length}
          icon={Award}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {!isLearner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Courses</CardTitle>
                <CardDescription>Latest published courses</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/courses")}>
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              ) : (
                <div className="space-y-3">
                  {courses.map((c) => (
                    <div
                      key={c._id}
                      onClick={() => navigate(`/courses/${c._id}`)}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-accent cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.totalModules} modules · {c.totalQuizQuestions} questions
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {c.difficulty}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLearner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Continue Learning</CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/my-learning")}>
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">You haven't enrolled in any courses yet.</p>
                  <Button onClick={() => navigate("/courses")}>Browse courses</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((e) => {
                    const course = typeof e.course === "object" ? e.course : null;
                    return (
                      <div
                        key={e._id}
                        onClick={() => course && navigate(`/learn/${course._id}`)}
                        className="p-3 rounded-md border hover:bg-accent cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{course?.title || "Course"}</div>
                          <Badge variant={STATUS_VARIANT[e.status]} className="capitalize">
                            {e.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{e.progressPercentage}%</span>
                          </div>
                          <Progress value={e.progressPercentage} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {role === "admin" && (
              <>
                <Button variant="outline" onClick={() => navigate("/categories")}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Categories
                </Button>
                <Button variant="outline" onClick={() => navigate("/courses?status=draft")}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Draft Courses
                </Button>
              </>
            )}
            {user?.role === "instructor" && (
              <Button variant="outline" onClick={() => navigate("/courses")}>
                <BookOpen className="h-4 w-4 mr-2" />
                My Courses
              </Button>
            )}
            {isLearner && (
              <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
            )}
            <Button variant="outline" onClick={() => navigate("/certificates")}>
              <Award className="h-4 w-4 mr-2" />
              Certificates
            </Button>
          </CardContent>
        </Card>
      </div>

      {enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {enrollments.slice(0, 5).map((e) => {
                const course = typeof e.course === "object" ? e.course : null;
                return (
                  <div key={e._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span>
                      <strong>{course?.title}</strong> — {e.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.lastAccessedAt ? formatDate(e.lastAccessedAt) : formatDate(e.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
