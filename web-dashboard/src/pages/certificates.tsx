import { useEffect, useState } from "react";
import { Award, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { useRole } from "@/hooks/use-role";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api";
import type { Certificate } from "@/types/lms";
import { formatDate } from "@/lib/utils";

export function CertificatesPage() {
  const { user } = useAuthStore();
  const { isLearner } = useRole();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .get<any, Certificate[]>(`/certificates/hotel/${user.hotelId}`)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as any).data || [];
        setCerts(isLearner ? list.filter((c: any) => (typeof c.user === "object" ? c.user._id : c.user) === user.id) : list);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-7 w-7" />
          Certificates
        </h1>
        <p className="text-muted-foreground">
          {isLearner ? "Your earned certificates" : "All certificates issued"}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No certificates yet. Complete a course to earn one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => {
            const course = typeof cert.course === "object" ? cert.course : null;
            const userObj = typeof cert.user === "object" ? cert.user : null;
            return (
              <Card key={cert._id} className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Award className="h-8 w-8 text-amber-500" />
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{course?.title || "Course"}</CardTitle>
                  <CardDescription>
                    Awarded to {userObj ? `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim() || userObj.email : "Learner"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate #</span>
                      <span className="font-mono">{cert.certificateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issued</span>
                      <span>{formatDate(cert.issueDate)}</span>
                    </div>
                    {cert.expiryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{formatDate(cert.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
