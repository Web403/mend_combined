import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, FileText, ClipboardList, CheckCircle2, Award, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "sonner";
import { coursesApi, enrollmentsApi, assessmentsApi, quizApi, lecturesApi, questionsApi } from "@/services/lms";
import type { Course, Module, Lecture, Assessment, AssessmentQuestion, Enrollment } from "@/types/lms";

export function LearnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [moduleLectures, setModuleLectures] = useState<Record<string, Lecture[]>>({});
  const [moduleAssessments, setModuleAssessments] = useState<Record<string, Assessment | null>>({});

  // Quiz taking
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [quizAttempt, setQuizAttempt] = useState<any | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await coursesApi.get(id);
      setCourse(c);
      try {
        const e = await enrollmentsApi.myEnrollments();
        const en = e.data.find((x: any) => (typeof x.course === "object" ? x.course._id : x.course) === id);
        if (en) setEnrollment(en);
      } catch {}
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Lazy-load lectures/assessments for each module
  useEffect(() => {
    if (!course?.modules) return;
    course.modules.forEach(async (m) => {
      if (!moduleLectures[m._id]) {
        try {
          const lectures = await lecturesApi.listByModule(m._id);
          setModuleLectures((prev) => ({ ...prev, [m._id]: lectures }));
        } catch {}
      }
      if (!moduleAssessments[m._id]) {
        try {
          const a = await assessmentsApi.getByModule(m._id).catch(() => null);
          setModuleAssessments((prev) => ({ ...prev, [m._id]: a }));
        } catch {}
      }
    });
  }, [course]);

  const startCourse = async () => {
    if (!course) return;
    try {
      await enrollmentsApi.start(course._id);
      toast.success("Course started!");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const applyCourse = async () => {
    if (!course) return;
    try {
      await enrollmentsApi.apply(course._id);
      toast.success("Application submitted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openLecture = async (m: Module, l: Lecture) => {
    try {
      const { lecture } = await lecturesApi.get(l._id);
      setActiveLecture(lecture);
      setActiveModule(m);
      setActiveAssessment(null);
      setQuizResult(null);
    } catch (e: any) {
      toast.error(e.message || "Unable to load this lecture");
    }
  };

  const completeLecture = async () => {
    if (!activeLecture) return;
    try {
      const updated = await enrollmentsApi.completeLecture(activeLecture._id);
      setEnrollment(updated);
      toast.success("Lecture marked complete");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startQuiz = async (a: Assessment) => {
    try {
      const res = await quizApi.start(a._id);
      setActiveAssessment(a);
      setQuizQuestions(res.questions);
      setQuizAnswers({});
      setQuizAttempt({ attemptNumber: res.attemptNumber });
      setQuizResult(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitQuiz = async () => {
    if (!activeAssessment) return;
    const answers = Object.entries(quizAnswers).map(([qid, selected]) => ({
      questionId: qid,
      selectedOptionIds: selected,
    }));
    try {
      const res = await quizApi.submit({ assessmentId: activeAssessment._id, answers });
      setQuizResult(res);
      toast.success(res.passed ? "You passed! 🎉" : "Try again");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
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

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.totalModules} modules · {course.totalQuizQuestions} questions</p>
        </div>
        {enrollment && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Your progress</div>
            <div className="text-2xl font-bold">{enrollment.progressPercentage}%</div>
          </div>
        )}
      </div>

      {!enrollment ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">You haven't applied to this course yet.</p>
            <Button onClick={applyCourse} size="lg">
              Apply for this course
            </Button>
          </CardContent>
        </Card>
      ) : enrollment.status === "applied" ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Your application is pending approval.</p>
          </CardContent>
        </Card>
      ) : enrollment.status === "enrolled" ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">You're enrolled. Ready to start?</p>
            <Button onClick={startCourse} size="lg">
              Start Course
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-2">
          {enrollment && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall progress</span>
                    <span className="font-medium">{enrollment.progressPercentage}%</span>
                  </div>
                  <Progress value={enrollment.progressPercentage} />
                  {enrollment.certificateIssuedAt && (
                    <div className="flex items-center gap-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                      <Award className="h-4 w-4" />
                      Certificate earned!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {course.modules?.map((m, idx) => {
            const lectures = moduleLectures[m._id] || [];
            const assessment = moduleAssessments[m._id];
            const moduleDone = enrollment?.completedModules.includes(m._id);
            return (
              <Card key={m._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {moduleDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2" />
                    )}
                    Module {idx + 1}: {m.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {lectures.map((l) => {
                    const completed = enrollment?.completedLectures.includes(l._id);
                    const isActive = activeLecture?._id === l._id;
                    return (
                      <button
                        key={l._id}
                        onClick={() => openLecture(m, l)}
                        disabled={!enrollment || enrollment.status === "applied"}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive ? "bg-accent" : ""
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <PlayCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate">{l.title}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    );
                  })}
                  {assessment && (
                    <button
                      onClick={() => startQuiz(assessment)}
                      disabled={!enrollment || enrollment.status === "applied"}
                      className="w-full text-left flex items-center gap-2 p-2 rounded text-sm hover:bg-accent disabled:opacity-50"
                    >
                      <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1">Quiz: {assessment.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {assessment.totalQuestions} Q
                      </Badge>
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {!activeLecture && !activeAssessment && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a lecture or quiz from the sidebar to begin</p>
              </CardContent>
            </Card>
          )}

          {activeLecture && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle>{activeLecture.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeModule?.title} · {activeLecture.estimatedDurationMinutes} min
                    </p>
                  </div>
                  {enrollment?.completedLectures.includes(activeLecture._id) ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Button onClick={completeLecture} disabled={!enrollment}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Content</h4>
                  <p className="text-sm whitespace-pre-wrap">{activeLecture.content}</p>
                </div>
                {activeLecture.steps && activeLecture.steps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Steps</h4>
                    <div className="space-y-2">
                      {activeLecture.steps.map((s) => (
                        <div key={s.stepNumber} className="flex gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                            {s.stepNumber}
                          </div>
                          <p className="text-sm pt-1">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeLecture.keyFigures && activeLecture.keyFigures.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Figures</h4>
                    <ul className="space-y-1 text-sm">
                      {activeLecture.keyFigures.map((k, i) => (
                        <li key={i} className="flex gap-2">
                          <span>👤</span> {k}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeAssessment && (
            <Card>
              <CardHeader>
                <CardTitle>{activeAssessment.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {quizResult
                    ? `You scored ${quizResult.scorePercentage}% (${quizResult.correctAnswers}/${quizResult.totalQuestions})`
                    : `Attempt ${quizAttempt?.attemptNumber} · ${quizQuestions.length} questions · ${activeAssessment.passingPercentage}% to pass`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {quizResult ? (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-lg text-center ${
                        quizResult.passed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}
                    >
                      <div className="text-3xl font-bold mb-1">{quizResult.scorePercentage}%</div>
                      <div className="font-semibold">{quizResult.passed ? "🎉 You passed!" : "Try again"}</div>
                    </div>
                    {activeAssessment.showExplanationAfterSubmit && (
                      <div className="space-y-3">
                        {quizResult.answers.map((a: any, i: number) => {
                          const q = typeof a.question === "object" ? a.question : null;
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded border ${
                                a.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
                              }`}
                            >
                              <div className="text-sm font-medium mb-1">
                                {i + 1}. {q?.questionText || "Question"}
                              </div>
                              <div className="text-xs">
                                {a.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                {q?.explanation && <span className="ml-2 italic">💡 {q.explanation}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setActiveAssessment(null);
                        setQuizResult(null);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {quizQuestions.map((q, idx) => (
                        <div key={q._id} className="space-y-2 p-3 border rounded">
                          <div className="font-medium text-sm">
                            {idx + 1}. {q.questionText}
                          </div>
                          <div className="space-y-1">
                            {q.options.map((o: any) => {
                              const checked = (quizAnswers[q._id] || []).includes(o.optionId);
                              return (
                                <label
                                  key={o.optionId}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer text-sm"
                                >
                                  <input
                                    type={q.questionType === "multi_select" ? "checkbox" : "radio"}
                                    name={`q-${q._id}`}
                                    checked={checked}
                                    onChange={() => {
                                      setQuizAnswers((prev) => {
                                        const cur = prev[q._id] || [];
                                        if (q.questionType === "multi_select") {
                                          return {
                                            ...prev,
                                            [q._id]: checked ? cur.filter((id) => id !== o.optionId) : [...cur, o.optionId],
                                          };
                                        }
                                        return { ...prev, [q._id]: [o.optionId] };
                                      });
                                    }}
                                  />
                                  {o.text}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setActiveAssessment(null)}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={submitQuiz}
                        disabled={Object.keys(quizAnswers).length === 0}
                      >
                        Submit Quiz
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
