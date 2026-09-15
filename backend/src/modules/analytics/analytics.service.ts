import { AnalyticsRepository } from "./analytics.repository";

export interface AdminAnalyticsSummary {
  hotelId?: string;
  totalHotels: number;
  activeEmployees: number;
  activeManagers: number;
  attendanceToday: number;
  complianceScore: number;
  fatigueAlerts: number;
  sosIncidents: number;
  openJobs: number;
  newApplications: number;
  certifiedHotels: number;
}

export interface HotelDashboardMetrics {
  totalEmployees: number;
  onShift: number;
  attendanceRate: number;
  complianceScore: number;
  fatigueAlerts: number;
  activeSOS: number;
  efficiency: number;
  pendingTasks: number;
  activeJobOpenings: number;
  certifiedStaff: number;
  pendingCertification: number;
  expiredCertificates: number;
  hesViolationCount: number;
}

export interface HotelDashboard {
  metrics: HotelDashboardMetrics;
  weeklyAttendance: Array<{ day: string; present: number; absent: number }>;
  certificationStatus: Record<string, number>;
  efficiencyTrend: Array<{ week: string; oph: number }>;
}

export class AnalyticsService {
  private readonly repo = new AnalyticsRepository();

  async getAdminSummary(hotelId?: string): Promise<AdminAnalyticsSummary> {
    const [
      totalHotels,
      activeEmployees,
      activeManagers,
      attendanceToday,
      complianceScore,
      fatigueAlerts,
      sosIncidents,
      openJobs,
      newApplications,
      certifiedHotels,
    ] = await Promise.all([
      this.repo.countHotels(hotelId),
      this.repo.countActiveEmployees(hotelId),
      this.repo.countActiveManagers(hotelId),
      this.repo.countAttendanceToday(hotelId),
      this.repo.getComplianceScore(hotelId),
      this.repo.countFatigueAlerts(hotelId),
      this.repo.countSOSIncidents(hotelId),
      this.repo.countOpenJobs(hotelId),
      this.repo.countNewApplications(hotelId),
      this.repo.countCertifiedHotels(hotelId),
    ]);

    return {
      hotelId,
      totalHotels,
      activeEmployees,
      activeManagers,
      attendanceToday,
      complianceScore,
      fatigueAlerts,
      sosIncidents,
      openJobs,
      newApplications,
      certifiedHotels,
    };
  }

  async getHotelDashboard(hotelId: string): Promise<HotelDashboard> {
    const [
      totalEmployees,
      onShift,
      attendanceRate,
      complianceScore,
      fatigueAlerts,
      activeSOS,
      efficiency,
      pendingTasks,
      activeJobOpenings,
      certifiedStaff,
      pendingCertification,
      expiredCertificates,
      hesViolationCount,
      weeklyAttendance,
      certificationStatus,
      efficiencyTrend,
    ] = await Promise.all([
      this.repo.countActiveEmployees(hotelId),
      this.repo.countOnShift(hotelId),
      this.repo.getAttendanceRate(hotelId),
      this.repo.getComplianceScore(hotelId),
      this.repo.countFatigueAlerts(hotelId),
      this.repo.countActiveSOS(hotelId),
      this.repo.getAverageOph(hotelId),
      this.repo.countPendingTasks(hotelId),
      this.repo.countOpenJobs(hotelId),
      this.repo.countCertifiedStaff(hotelId),
      this.repo.countPendingCertification(hotelId),
      this.repo.countExpiredCertificates(hotelId),
      this.repo.getHesViolationCount(hotelId),
      this.repo.getWeeklyAttendance(hotelId),
      this.repo.getCertificationStatusBreakdown(hotelId),
      this.repo.getEfficiencyTrend(hotelId),
    ]);

    return {
      metrics: {
        totalEmployees,
        onShift,
        attendanceRate,
        complianceScore,
        fatigueAlerts,
        activeSOS,
        efficiency,
        pendingTasks,
        activeJobOpenings,
        certifiedStaff,
        pendingCertification,
        expiredCertificates,
        hesViolationCount,
      },
      weeklyAttendance,
      certificationStatus,
      efficiencyTrend,
    };
  }
}
