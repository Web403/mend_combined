/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Job posts are checked for unsafe shift patterns (phrases such as "no break"
 * or "24/7"). The numeric shift-length and recovery-length check is not applied.
 */

const mockJobs: any = {
  create: jest.fn(),
  findByIdAndHotel: jest.fn(),
  update: jest.fn(),
};

jest.mock("../../src/modules/recruitment/job.repository", () => ({
  JobRepository: jest.fn().mockImplementation(() => mockJobs),
}));
jest.mock("../../src/modules/hotel/hotel.model", () => ({
  HotelModel: { findById: () => ({ lean: async () => ({ isStriked: false }) }) },
}));
jest.mock("../../src/modules/passport/passport.model", () => ({ PassportModel: {} }));

import { RecruitmentService } from "../../src/modules/recruitment/recruitment.service";
import { AppError } from "../../src/core/middleware/error.middleware";
import { CertificationLevel, EmploymentType, JobDepartment, JobStatus } from "../../src/shared/enums/recruitment";

const HOTEL = "65a1b2c3d4e5f60718293a4b";
const JOB_ID = "JOB_test01";

const dto = (overrides: Record<string, unknown> = {}) => ({
  title: "Line cook",
  description: "Prep and grill station",
  department: JobDepartment.FOOD_AND_BEVERAGE,
  employmentType: EmploymentType.FULL_TIME,
  vacancies: 2,
  shiftPolicy: "Up to 12 hours per shift, 5 days a week",
  recoveryPolicy: "Minimum 8 hours between shifts",
  certificationRequired: CertificationLevel.NONE,
  ...overrides,
});

const storedJob = (overrides: Record<string, unknown> = {}) => ({
  id: JOB_ID,
  hotelId: HOTEL,
  title: "Line cook",
  description: "Prep and grill station",
  department: JobDepartment.FOOD_AND_BEVERAGE,
  employmentType: EmploymentType.FULL_TIME,
  vacancies: 2,
  shiftPolicy: "Up to 8 hours per shift",
  recoveryPolicy: "Minimum 12 hours between shifts",
  certificationRequired: CertificationLevel.NONE,
  requiredSkills: [],
  status: JobStatus.DRAFT,
  applicationCount: 0,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockJobs.create.mockImplementation(async (data: any) => storedJob({ ...data, createdAt: new Date(), updatedAt: new Date() }));
  mockJobs.findByIdAndHotel.mockResolvedValue(storedJob());
  mockJobs.update.mockImplementation(async (_h: string, _id: string, payload: any) => storedJob(payload));
});

const service = () => new RecruitmentService();

describe("job posts — shift and recovery policy", () => {
  it("accepts a post with shift and recovery lengths the numeric check used to refuse", async () => {
    const job = await service().createJob(HOTEL, "posted-by", dto());
    expect(job.shiftPolicy).toBe("Up to 12 hours per shift, 5 days a week");
    expect(job.recoveryPolicy).toBe("Minimum 8 hours between shifts");
    expect(mockJobs.create).toHaveBeenCalledTimes(1);
  });

  it("still refuses a post whose policy contains an unsafe phrase", async () => {
    const attempt = service().createJob(HOTEL, "posted-by", dto({ shiftPolicy: "No break during the shift" }));
    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({ statusCode: 422, message: "Unsafe shift or recovery policy detected." });
    expect(mockJobs.create).not.toHaveBeenCalled();
  });

  it("still refuses an unsafe recovery phrase on update", async () => {
    const attempt = service().updateJob(HOTEL, JOB_ID, { recoveryPolicy: "No rest between shifts" });
    await expect(attempt).rejects.toMatchObject({ statusCode: 422 });
    expect(mockJobs.update).not.toHaveBeenCalled();
  });

  it("accepts an update to shift and recovery lengths", async () => {
    const job = await service().updateJob(HOTEL, JOB_ID, {
      shiftPolicy: "Up to 11 hours per shift",
      recoveryPolicy: "Minimum 6 hours between shifts",
    });
    expect(job.shiftPolicy).toBe("Up to 11 hours per shift");
    expect(mockJobs.update).toHaveBeenCalledTimes(1);
  });
});
