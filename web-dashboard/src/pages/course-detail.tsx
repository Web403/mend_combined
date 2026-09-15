import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  PlayCircle,
  ClipboardList,
  MoreHorizontal,
  Award,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { coursesApi, modulesApi, lecturesApi, assessmentsApi, questionsApi, enrollmentsApi } from "@/services/lms";
import { useRole } from "@/hooks/use-role";
import type { Course, Module, Lecture, Assessment, AssessmentQuestion, Category, ContentBlockType } from "@/types/lms";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT: any = { draft: "secondary", published: "success", archived: "outline" };

export function CourseDetailPage() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const { can, isLearner } = useRole();
  const canEdit = can(["admin", "instructor"]);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Module mgmt
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", estimatedDurationMinutes: 0 });
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleLectures, setModuleLectures] = useState<Record<string, Lecture[]>>({});
  const [moduleAssessments, setModuleAssessments] = useState<Record<string, Assessment | null>>({});

  // Lecture mgmt
  const [lectureDialog, setLectureDialog] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [lectureForm, setLectureForm] = useState<{
    module: string;
    course: string;
    title: string;
    difficulty: string;
    content: string;
    steps: { stepNumber: number; text: string }[];
    keyFigures: string;
    estimatedDurationMinutes: number;
  }>({ module: "", course: "", title: "", difficulty: "beginner", content: "", steps: [], keyFigures: "", estimatedDurationMinutes: 0 });

  // Assessment mgmt
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    moduleId: "",
    title: "",
    passingPercentage: 70,
    maxAttempts: 0,
    timeLimitMinutes: 0,
    shuffleQuestions: false,
    shuffleOptions: false,
    showExplanationAfterSubmit: true,
  });
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);

  // Question dialog
  const [questionDialog, setQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    assessmentId: string;
    questionText: string;
    questionType: string;
    options: { text: string; isCorrect: boolean }[];
    explanation: string;
    points: number;
  }>({ assessmentId: "", questionText: "", questionType: "multiple_choice", options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }], explanation: "", points: 1 });

  const loadCourse = async () => {
    if (!id && !slug) return;
    setLoading(true);
    try {
      const c = slug ? await coursesApi.getBySlug(slug) : await coursesApi.get(id!);
      setCourse(c);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [id, slug]);

  const loadModule = async (m: Module) => {
    try {
      const [lectures, assess] = await Promise.all([
        lecturesApi.listByModule(m._id),
        assessmentsApi.getByModule(m._id).catch(() => null),
      ]);
      setModuleLectures((prev) => ({ ...prev, [m._id]: lectures }));
      setModuleAssessments((prev) => ({ ...prev, [m._id]: assess }));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleModule = (m: Module) => {
    if (expandedModule === m._id) {
      setExpandedModule(null);
    } else {
      setExpandedModule(m._id);
      if (!moduleLectures[m._id]) loadModule(m);
    }
  };

  // ── Module CRUD ──────────────────────────────────────
  const openCreateModule = () => {
    setEditingModule(null);
    setModuleForm({ title: "", description: "", estimatedDurationMinutes: 0 });
    setModuleDialog(true);
  };

  const openEditModule = (m: Module) => {
    setEditingModule(m);
    setModuleForm({
      title: m.title,
      description: m.description || "",
      estimatedDurationMinutes: m.estimatedDurationMinutes,
    });
    setModuleDialog(true);
  };

  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    try {
      if (editingModule) {
        await modulesApi.update(editingModule._id, moduleForm);
        toast.success("Module updated");
      } else {
        await modulesApi.create({ courseId: course._id, ...moduleForm });
        toast.success("Module created");
      }
      setModuleDialog(false);
      loadCourse();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteModule = async (m: Module) => {
    if (!confirm(`Delete module "${m.title}"? This will delete all lectures and the assessment.`)) return;
    try {
      await modulesApi.remove(m._id);
      toast.success("Module deleted");
      loadCourse();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Lecture CRUD ─────────────────────────────────────
  const openCreateLecture = (m: Module) => {
    if (!course) return;
    setEditingLecture(null);
    setLectureForm({
      module: m._id,
      course: course._id,
      title: "",
      difficulty: "beginner",
      content: "",
      steps: [],
      keyFigures: "",
      estimatedDurationMinutes: 0,
    });
    setLectureDialog(true);
  };

  const openEditLecture = (l: Lecture) => {
    if (!course) return;
    setEditingLecture(l);
    setLectureForm({
      module: l.module,
      course: l.course,
      title: l.title,
      difficulty: l.difficulty,
      content: l.content,
      steps: l.steps || [],
      keyFigures: (l.keyFigures || []).join(", "),
      estimatedDurationMinutes: l.estimatedDurationMinutes,
    });
    setLectureDialog(true);
  };

  const saveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...lectureForm,
        keyFigures: lectureForm.keyFigures
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        steps: lectureForm.steps.filter((s) => s.text.trim()),
        difficulty: lectureForm.difficulty as any,
      };
      if (editingLecture) {
        await lecturesApi.update(editingLecture._id, payload as any);
        toast.success("Lecture updated");
      } else {
        await lecturesApi.create(payload as any);
        toast.success("Lecture created");
      }
      setLectureDialog(false);
      loadCourse();
      if (expandedModule) {
        const m = course?.modules?.find((x) => x._id === expandedModule);
        if (m) loadModule(m);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteLecture = async (l: Lecture) => {
    if (!confirm(`Delete lecture "${l.title}"?`)) return;
    try {
      await lecturesApi.remove(l._id);
      toast.success("Lecture deleted");
      loadCourse();
      if (expandedModule) {
        const m = course?.modules?.find((x) => x._id === expandedModule);
        if (m) loadModule(m);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Assessment CRUD ──────────────────────────────────
  const openCreateAssessment = (m: Module) => {
    if (!course) return;
    setEditingAssessment(null);
    setAssessmentForm({
      moduleId: m._id,
      title: "",
      passingPercentage: 70,
      maxAttempts: 0,
      timeLimitMinutes: 0,
      shuffleQuestions: false,
      shuffleOptions: false,
      showExplanationAfterSubmit: true,
    });
    setAssessmentDialog(true);
  };

  const openEditAssessment = async (a: Assessment) => {
    setEditingAssessment(a);
    setAssessmentForm({
      moduleId: a.module,
      title: a.title,
      passingPercentage: a.passingPercentage,
      maxAttempts: a.maxAttempts,
      timeLimitMinutes: a.timeLimitMinutes,
      shuffleQuestions: a.shuffleQuestions,
      shuffleOptions: a.shuffleOptions,
      showExplanationAfterSubmit: a.showExplanationAfterSubmit,
    });
    setAssessmentDialog(true);
  };

  const saveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    try {
      if (editingAssessment) {
        await assessmentsApi.update(editingAssessment._id, assessmentForm);
        toast.success("Assessment updated");
      } else {
        await assessmentsApi.create({ courseId: course._id, ...assessmentForm });
        toast.success("Assessment created");
      }
      setAssessmentDialog(false);
      loadCourse();
      if (expandedModule) {
        const m = course.modules?.find((x) => x._id === expandedModule);
        if (m) loadModule(m);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAssessment = async (a: Assessment) => {
    if (!confirm(`Delete assessment "${a.title}" and all its questions?`)) return;
    try {
      await assessmentsApi.remove(a._id);
      toast.success("Assessment deleted");
      loadCourse();
      if (expandedModule) {
        const m = course?.modules?.find((x) => x._id === expandedModule);
        if (m) loadModule(m);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openQuestions = async (a: Assessment) => {
    setSelectedAssessment(a);
    try {
      const qs = await questionsApi.list(a._id);
      setQuestions(qs);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Question CRUD ────────────────────────────────────
  const openCreateQuestion = () => {
    if (!selectedAssessment) return;
    setEditingQuestion(null);
    setQuestionForm({
      assessmentId: selectedAssessment._id,
      questionText: "",
      questionType: "multiple_choice",
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ],
      explanation: "",
      points: 1,
    });
    setQuestionDialog(true);
  };

  const openEditQuestion = (q: AssessmentQuestion) => {
    setEditingQuestion(q);
    setQuestionForm({
      assessmentId: q.assessment,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      explanation: q.explanation || "",
      points: q.points,
    });
    setQuestionDialog(true);
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await questionsApi.update(editingQuestion._id, {
          questionText: questionForm.questionText,
          questionType: questionForm.questionType as any,
          options: questionForm.options,
          explanation: questionForm.explanation,
          points: questionForm.points,
        } as any);
        toast.success("Question updated");
      } else {
        await questionsApi.add({
          assessmentId: questionForm.assessmentId,
          questionText: questionForm.questionText,
          questionType: questionForm.questionType as any,
          options: questionForm.options.filter((o) => o.text.trim()),
          explanation: questionForm.explanation,
          points: questionForm.points,
        });
        toast.success("Question added");
      }
      setQuestionDialog(false);
      if (selectedAssessment) {
        const qs = await questionsApi.list(selectedAssessment._id);
        setQuestions(qs);
      }
      loadCourse();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteQuestion = async (q: AssessmentQuestion) => {
    if (!confirm("Delete this question?")) return;
    try {
      await questionsApi.remove(q._id);
      toast.success("Question deleted");
      if (selectedAssessment) {
        const qs = await questionsApi.list(selectedAssessment._id);
        setQuestions(qs);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p>Course not found.</p>
        <Button onClick={() => navigate("/courses")} className="mt-4">
          Back to courses
        </Button>
      </div>
    );
  }

  const cat = typeof course.category === "object" ? (course.category as Category) : null;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{course.title}</h1>
            <Badge variant={STATUS_VARIANT[course.status]} className="capitalize">
              {course.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {course.difficulty}
            </Badge>
          </div>
          {cat && <p className="text-sm text-muted-foreground">{cat.icon} {cat.name}</p>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          {!isLearner && <TabsTrigger value="learners">Learners</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{course.totalModules}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Quiz Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{course.totalQuizQuestions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" /> Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{course.estimatedDurationMinutes}m</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>About this course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.description && <p className="text-sm">{course.description}</p>}
              {course.learningOutcomes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Learning Outcomes</h4>
                  <ul className="space-y-1 text-sm">
                    {course.learningOutcomes.map((o, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">✓</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {course.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {course.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Published {course.publishedAt ? formatDate(course.publishedAt) : "Draft · created " + formatDate(course.createdAt)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Modules</h2>
              <p className="text-sm text-muted-foreground">Each module can contain lectures and an assessment</p>
            </div>
            {canEdit && (
              <Button onClick={openCreateModule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            )}
          </div>

          {!course.modules || course.modules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No modules yet. {canEdit && "Add the first one to get started."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {course.modules.map((m, idx) => (
                <Card key={m._id}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4">
                      <Button variant="ghost" size="icon" onClick={() => toggleModule(m)}>
                        {expandedModule === m._id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          Module {idx + 1}: {m.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.totalLessons} lessons · {m.totalQuizQuestions} questions
                          {m.estimatedDurationMinutes != null && ` · ${m.estimatedDurationMinutes}m`}
                        </div>
                      </div>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModule(m)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Module
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCreateLecture(m)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Lecture
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                moduleAssessments[m._id] ? openEditAssessment(moduleAssessments[m._id]!) : openCreateAssessment(m)
                              }
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {moduleAssessments[m._id] ? "Edit Assessment" : "Add Assessment"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteModule(m)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Module
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {expandedModule === m._id && (
                      <div className="border-t bg-muted/30 p-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" /> Lectures
                          </h4>
                          {!moduleLectures[m._id] ? (
                            <Skeleton className="h-12" />
                          ) : moduleLectures[m._id]!.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No lectures yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {moduleLectures[m._id]!.map((l, lidx) => (
                                <div key={l._id} className="flex items-center justify-between bg-background p-2 rounded border">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xs text-muted-foreground w-6">{lidx + 1}.</span>
                                    <span className="text-sm truncate">{l.title}</span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {l.difficulty}
                                    </Badge>
                                  </div>
                                  {canEdit && (
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLecture(l)}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => deleteLecture(l)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => openCreateLecture(m)} className="mt-2">
                              <Plus className="h-3 w-3 mr-1" /> Add Lecture
                            </Button>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Assessment
                          </h4>
                          {!moduleAssessments[m._id] ? (
                            canEdit ? (
                              <Button variant="outline" size="sm" onClick={() => openCreateAssessment(m)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Quiz
                              </Button>
                            ) : (
                              <p className="text-xs text-muted-foreground">No quiz yet.</p>
                            )
                          ) : (
                            <div className="bg-background p-3 rounded border flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{moduleAssessments[m._id]!.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {moduleAssessments[m._id]!.totalQuestions} questions ·{" "}
                                  {moduleAssessments[m._id]!.passingPercentage}% to pass
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => openQuestions(moduleAssessments[m._id]!)}>
                                  Manage Questions
                                </Button>
                                {canEdit && (
                                  <Button size="sm" variant="ghost" onClick={() => openEditAssessment(moduleAssessments[m._id]!)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button size="sm" variant="ghost" onClick={() => deleteAssessment(moduleAssessments[m._id]!)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {!isLearner && (
          <TabsContent value="learners">
            <LearnersTab courseId={course._id} />
          </TabsContent>
        )}
      </Tabs>

      {/* ── Module dialog ──────────────────────────── */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Module" : "Create Module"}</DialogTitle>
            <DialogDescription>Modules group related lectures and contain a quiz</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveModule} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Duration (minutes)</Label>
              <Input
                type="number"
                value={moduleForm.estimatedDurationMinutes}
                onChange={(e) =>
                  setModuleForm({ ...moduleForm, estimatedDurationMinutes: Number(e.target.value) })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModuleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingModule ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Lecture dialog ──────────────────────────── */}
      <Dialog open={lectureDialog} onOpenChange={setLectureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLecture ? "Edit Lecture" : "Create Lecture"}</DialogTitle>
            <DialogDescription>A lesson within a module</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLecture} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Title</Label>
                <Input
                  value={lectureForm.title}
                  onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={lectureForm.difficulty}
                  onValueChange={(v) => setLectureForm({ ...lectureForm, difficulty: v })}
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
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={lectureForm.estimatedDurationMinutes}
                  onChange={(e) =>
                    setLectureForm({ ...lectureForm, estimatedDurationMinutes: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Content</Label>
                <Textarea
                  value={lectureForm.content}
                  onChange={(e) => setLectureForm({ ...lectureForm, content: e.target.value })}
                  rows={6}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Key Figures (comma separated)</Label>
                <Input
                  value={lectureForm.keyFigures}
                  onChange={(e) => setLectureForm({ ...lectureForm, keyFigures: e.target.value })}
                  placeholder="John Smith — CEO, Jane Doe — Manager"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLectureForm({
                        ...lectureForm,
                        steps: [...lectureForm.steps, { stepNumber: lectureForm.steps.length + 1, text: "" }],
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {lectureForm.steps.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted text-sm font-medium">
                        {s.stepNumber}
                      </div>
                      <Input
                        value={s.text}
                        onChange={(e) => {
                          const next = [...lectureForm.steps];
                          next[i] = { ...s, text: e.target.value };
                          setLectureForm({ ...lectureForm, steps: next });
                        }}
                        placeholder="Step description"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setLectureForm({
                            ...lectureForm,
                            steps: lectureForm.steps.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLectureDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingLecture ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Assessment dialog ──────────────────────── */}
      <Dialog open={assessmentDialog} onOpenChange={setAssessmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssessment ? "Edit Assessment" : "Create Assessment"}</DialogTitle>
            <DialogDescription>Quiz settings for this module</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAssessment} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passing %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={assessmentForm.passingPercentage}
                  onChange={(e) =>
                    setAssessmentForm({ ...assessmentForm, passingPercentage: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max attempts (0 = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={assessmentForm.maxAttempts}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, maxAttempts: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time limit (min, 0 = none)</Label>
                <Input
                  type="number"
                  min={0}
                  value={assessmentForm.timeLimitMinutes}
                  onChange={(e) =>
                    setAssessmentForm({ ...assessmentForm, timeLimitMinutes: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssessmentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingAssessment ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Questions dialog ─────────────────────── */}
      <Dialog open={!!selectedAssessment && !questionDialog} onOpenChange={(o) => !o && setSelectedAssessment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAssessment?.title} — Questions</DialogTitle>
            <DialogDescription>
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>
            ) : (
              questions.map((q, i) => (
                <Card key={q._id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {i + 1}. {q.questionText}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{q.questionType.replace("_", " ")}</div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditQuestion(q)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteQuestion(q)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {q.options.map((o) => (
                        <div
                          key={o.optionId}
                          className={`p-1.5 rounded border ${o.isCorrect ? "border-emerald-500 bg-emerald-50" : ""}`}
                        >
                          {o.isCorrect && "✓ "}
                          {o.text}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="text-xs text-muted-foreground italic border-l-2 pl-2">💡 {q.explanation}</div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            {canEdit && (
              <Button onClick={openCreateQuestion}>
                <Plus className="h-4 w-4 mr-2" /> Add Question
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedAssessment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question dialog ────────────────────────── */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveQuestion} className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                rows={2}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={questionForm.questionType}
                  onValueChange={(v) => setQuestionForm({ ...questionForm, questionType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="multi_select">Multi Select</SelectItem>
                    <SelectItem value="ordering">Ordering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options (check the correct one{questionForm.questionType === "multi_select" ? "s" : ""})</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setQuestionForm({
                      ...questionForm,
                      options: [...questionForm.options, { text: "", isCorrect: false }],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Option
                </Button>
              </div>
              <div className="space-y-2">
                {questionForm.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type={questionForm.questionType === "multi_select" ? "checkbox" : "radio"}
                      name="correct"
                      checked={o.isCorrect}
                      onChange={() => {
                        const next = questionForm.options.map((opt, idx) => ({
                          ...opt,
                          isCorrect:
                            questionForm.questionType === "multi_select"
                              ? idx === i
                                ? !opt.isCorrect
                                : opt.isCorrect
                              : idx === i,
                        }));
                        setQuestionForm({ ...questionForm, options: next });
                      }}
                      className="mt-2"
                    />
                    <Input
                      value={o.text}
                      onChange={(e) => {
                        const next = [...questionForm.options];
                        next[i] = { ...o, text: e.target.value };
                        setQuestionForm({ ...questionForm, options: next });
                      }}
                      placeholder={`Option ${i + 1}`}
                      required
                    />
                    {questionForm.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setQuestionForm({
                            ...questionForm,
                            options: questionForm.options.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuestionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingQuestion ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Learners Tab (separate to keep parent tidy) ─────────
function LearnersTab({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const { can } = useRole();

  const load = () => {
    setLoading(true);
    enrollmentsApi
      .byCourse(courseId, statusFilter as any, 1, 50)
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
      toast.success("Enrollment approved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Enrolled Learners ({total})</CardTitle>
          <CardDescription>Manage enrollments and approvals</CardDescription>
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
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32" />
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No enrollments yet.</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((e) => {
              const u = typeof e.user === "object" ? e.user : { _id: e.user };
              return (
                <div key={e._id} className="flex items-center gap-3 p-3 border rounded">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                    {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="w-32">
                    <div className="text-xs text-muted-foreground mb-1">{e.progressPercentage}%</div>
                    <Progress value={e.progressPercentage} />
                  </div>
                  <Badge variant="outline" className="capitalize w-24 justify-center">
                    {e.status.replace("_", " ")}
                  </Badge>
                  {e.status === "applied" && can(["admin", "instructor"]) && (
                    <Button size="sm" onClick={() => approve(e._id)}>
                      Approve
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
