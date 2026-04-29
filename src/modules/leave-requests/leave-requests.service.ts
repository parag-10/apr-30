import { Injectable } from '@nestjs/common';

/**
 * ============================================================
 * MODULE 4 — TRAINEE IMPLEMENTATION
 * ============================================================
 * This service is intentionally left empty for trainees to implement.
 *
 * Refer to HRFLOW_BACKEND_IMPLEMENTATION.md → Section 8 for:
 *  - Endpoint specifications
 *  - Business rules (working days calc, balance check, overlap detection, etc.)
 *  - DTO definitions
 *
 * Key business rules to implement:
 * 1. Working days calculation (exclude weekends + public holidays)
 * 2. Balance check before submission
 * 3. Overlap detection against existing approved leaves
 * 4. Deduct balance only on APPROVAL (not on submission)
 * 5. Restore balance on cancellation of an approved leave
 * 6. Manager scope — can only approve direct reports
 * 7. Self-approval forbidden
 * 8. Mandatory reject reason (non-empty comments)
 */
@Injectable()
export class LeaveRequestsService {}
