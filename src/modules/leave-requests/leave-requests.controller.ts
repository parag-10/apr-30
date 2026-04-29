import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeaveRequestsService } from './leave-requests.service';

/**
 * ============================================================
 * MODULE 4 — TRAINEE IMPLEMENTATION
 * ============================================================
 * Implement the following endpoints:
 *
 * POST   /leave-requests              — Submit a leave request
 * GET    /leave-requests/my           — Get own leave history
 * GET    /leave-requests/team         — Get team's leave requests (manager, hr_admin)
 * GET    /leave-requests              — Get all requests with filters (hr_admin)
 * PUT    /leave-requests/:id/approve  — Approve a request (manager, hr_admin)
 * PUT    /leave-requests/:id/reject   — Reject with mandatory reason (manager, hr_admin)
 * PUT    /leave-requests/:id/cancel   — Cancel a pending request (own only / hr_admin any)
 */
@ApiTags('Leave Requests')
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}
}
