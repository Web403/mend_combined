import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, MoreHorizontal, Search, BookOpen, Eye, Send, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { coursesApi, categoriesApi } from "@/services/lms";
import { useRole } from "@/hooks/use-role";
import { CourseBadge, CourseDifficulty } from "@/types/lms";
import type { Category, Course, CourseStatus } from "@/types/lms";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<CourseStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline"> = {
  draft: "secondary",
  published: "success",
  archived: "outline",
};

export function CoursesPage() {
  const { can, isLearner } = useRole();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive">("active");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    description: "",
    coverImage: "",
    icon: "",
    learningOutcomes: "",
    tags: "",
    badge: "" as CourseBadge | "",
    difficulty: "beginner" as CourseDifficulty,
    estimatedDurationMinutes: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    coursesApi
      .list({
        page,
        limit: 20,
        search: search || undefined,
        category: categoryFilter || undefined,
        status: (statusFilter as CourseStatus) || undefined,
        difficulty: (difficultyFilter as CourseDifficulty) || undefined,
        badge: (badgeFilter as CourseBadge) || undefined,
        isActive: activeFilter === "active",
        sortBy,
        sortOrder,
      })
      .then((res) => {
        setCourses(res.data);
        setTotal(res.total);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, statusFilter, categoryFilter, difficultyFilter, badgeFilter, activeFilter, sortBy, sortOrder]);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      categoryId: categories[0]?._id || "",
      description: "",
      coverImage: "",
      icon: "",
      learningOutcomes: "",
      tags: "",
      badge: "",
      difficulty: CourseDifficulty.BEGINNER,
      estimatedDurationMinutes: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      categoryId: typeof c.category === "object" ? (c.category as Category)._id : c.category,
      description: c.description || "",
      coverImage: c.coverImage || "",
      icon: c.icon || "",
      learningOutcomes: c.learningOutcomes.join("\n"),
      tags: c.tags.join(", "),
      badge: c.badge || "",
      difficulty: c.difficulty,
      estimatedDurationMinutes: c.estimatedDurationMinutes,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        categoryId: form.categoryId,
        description: form.description,
        coverImage: form.coverImage,
        icon: form.icon,
        learningOutcomes: form.learningOutcomes.split("\n").filter(Boolean),
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        badge: form.badge || undefined,
        difficulty: form.difficulty,
        estimatedDurationMinutes: form.estimatedDurationMinutes,
      };
      if (editing) {
        await coursesApi.update(editing._id, payload);
        toast.success("Course updated");
      } else {
        await coursesApi.create(payload);
        toast.success("Course created");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (c: Course) => {
    try {
      await coursesApi.publish(c._id);
      toast.success("Course published");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleArchive = async (c: Course) => {
    try {
      await coursesApi.archive(c._id);
      toast.success("Course archived");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (c: Course) => {
    if (!confirm(`Delete "${c.title}"? This will delete all modules, lectures, and assessments.`)) return;
    try {
      await coursesApi.remove(c._id);
      toast.success("Course deleted");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const totalPages = Math.ceil(total / 20);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setDifficultyFilter("");
    setBadgeFilter("");
    setActiveFilter("active");
    setSortBy("sortOrder");
    setSortOrder("asc");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">Browse, create and manage courses</p>
        </div>
        {can(["admin", "instructor"]) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Course" : "Create Course"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update course details." : "Add a new course to your catalog."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={form.difficulty}
                      onValueChange={(v) => setForm({ ...form, difficulty: v as CourseDifficulty })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon (emoji)</Label>
                    <Input
                      id="icon"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      placeholder="📚"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverImage">Cover Image URL</Label>
                    <Input
                      id="coverImage"
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="badge">Badge</Label>
                    <Select
                      value={form.badge}
                      onValueChange={(v) => setForm({ ...form, badge: v as CourseBadge })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="popular">Popular</SelectItem>
                        <SelectItem value="updated">Updated</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={form.estimatedDurationMinutes}
                      onChange={(e) =>
                        setForm({ ...form, estimatedDurationMinutes: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="outcomes">Learning Outcomes (one per line)</Label>
                    <Textarea
                      id="outcomes"
                      value={form.learningOutcomes}
                      onChange={(e) => setForm({ ...form, learningOutcomes: e.target.value })}
                      rows={3}
                      placeholder="Understand hospitality best practices&#10;Provide excellent guest service"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="service, hospitality, training"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : editing ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => {
                setStatusFilter(v === "all" ? "" : v);
                if (v === "archived") setActiveFilter("inactive");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Published" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Published (default)</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter || "all"} onValueChange={(v) => { setCategoryFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter || "all"} onValueChange={(v) => { setDifficultyFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All difficulties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {Object.values(CourseDifficulty).map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty} className="capitalize">{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={badgeFilter || "all"} onValueChange={(v) => { setBadgeFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All badges" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All badges</SelectItem>
                {Object.values(CourseBadge).map((badge) => (
                  <SelectItem key={badge} value={badge} className="capitalize">{badge}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v as "active" | "inactive"); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active courses</SelectItem>
                <SelectItem value="inactive">Inactive courses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sortOrder">Custom order</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="createdAt">Date created</SelectItem>
                <SelectItem value="publishedAt">Date published</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v as "asc" | "desc"); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No courses found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const cat = typeof c.category === "object" ? (c.category as Category) : null;
              return (
                <Card key={c._id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl">
                    {c.icon || cat?.icon || "📘"}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{c.title}</h3>
                        <p className="text-xs text-muted-foreground">{cat?.name}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/courses/${c._id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Manage
                          </DropdownMenuItem>
                          {can(["admin", "instructor"]) && (
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {c.status !== "published" && can(["admin", "instructor"]) && (
                            <DropdownMenuItem onClick={() => handlePublish(c)}>
                              <Send className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {c.status === "published" && can(["admin"]) && (
                            <DropdownMenuItem onClick={() => handleArchive(c)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {can(["admin"]) && (
                            <DropdownMenuItem onClick={() => handleDelete(c)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">
                        {c.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {c.difficulty}
                      </Badge>
                      {c.badge && (
                        <Badge variant="info" className="capitalize">
                          {c.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>{c.totalModules} modules</span>
                      <span>{c.totalQuizQuestions} questions</span>
                      <span>{formatDate(c.publishedAt || c.createdAt)}</span>
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => navigate(isLearner ? `/learn/${c._id}` : `/courses/${c._id}`)}
                    >
                      {can(["admin", "instructor"]) ? "Manage" : isLearner ? "Enroll" : "View Course"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// (helpers removed — single "View" CTA covers all roles)
