export enum ReviewType {
    GIG = "GIG",
    JOB = "JOB",
    /**
     * Review rooted in an employment / organisation membership relationship
     * (User.hotelId) rather than a gig or a job posting.
     *
     * Additive value: existing documents keep GIG / JOB.
     */
    EMPLOYMENT = "EMPLOYMENT"
}

/**
 * Which collection `Review.revieweeId` points at.
 * Used as the `refPath` target so a single field can reference either a
 * person (Employee / Manager / Student) or a Hotel.
 */
export enum RevieweeRef {
    USER = "User",
    HOTEL = "Hotel"
}

/**
 * The reviewer → reviewee relationship a review represents.
 *
 * This is the authoritative discriminator used by the eligibility engine and by
 * the partial unique index that prevents duplicate reviews. It is intentionally
 * a separate axis from `ReviewType` (which describes the *context*: gig, job or
 * employment) so existing `reviewType` filters keep working untouched.
 *
 * Documents created before this field existed simply do not carry it.
 */
export enum ReviewRelationship {
    HR_TO_EMPLOYEE = "HR_TO_EMPLOYEE",
    HR_TO_MANAGER = "HR_TO_MANAGER",
    HR_TO_STUDENT = "HR_TO_STUDENT",
    EMPLOYEE_TO_HOTEL = "EMPLOYEE_TO_HOTEL",
    MANAGER_TO_HOTEL = "MANAGER_TO_HOTEL",
    STUDENT_TO_HOTEL = "STUDENT_TO_HOTEL",
    STUDENT_TO_MANAGER = "STUDENT_TO_MANAGER"
}
