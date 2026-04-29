import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

/**
 * ============================================================
 * MODULE 6 — TRAINEE IMPLEMENTATION
 * ============================================================
 * Implement the following endpoints:
 *
 * GET /reports/dashboard         — KPI summary cards (hr_admin)
 * GET /reports/leave-summary     — Per-employee leave summary for a year (hr_admin)
 * GET /reports/department-leave  — Leave utilization by department for a month (hr_admin)
 * GET /reports/absenteeism       — Employees exceeding leave threshold (hr_admin)
 * GET /reports/upcoming-leaves   — Leaves starting in next N days (hr_admin, manager)
 */
@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}
}
