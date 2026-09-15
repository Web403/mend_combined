import { JobModel } from "../modules/recruitment/job.model";
import { createBaseFields } from "./utils";
import { JobDepartment, EmploymentType, CertificationLevel, JobStatus } from "../shared/enums/recruitment";

export const seedJobs = async (hotelId: string, postedBy: string) => {
  await JobModel.create({
    ...createBaseFields(hotelId, "JOB"),
    title: "Front Office Executive",
    description: "Responsible for guest check-ins, handling reservations, and providing excellent customer service.",
    department: JobDepartment.FRONT_OFFICE,
    employmentType: EmploymentType.FULL_TIME,
    vacancies: 3,
    shiftPolicy: "Max 10 hours/day",
    recoveryPolicy: "14 hour mandatory rest",
    certificationRequired: CertificationLevel.MEND_CERTIFIED,
    status: JobStatus.OPEN,
    postedBy,
    requiredSkills: ["Guest service", "Reservations", "Communication"],
    experienceRequired: "1-2 years",
    salaryMin: 20000,
    salaryMax: 30000,
    salaryCurrency: "INR"
  });

  console.log("💼 Jobs seeded");
};