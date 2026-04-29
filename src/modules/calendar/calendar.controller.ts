import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';

/**
 * ============================================================
 * MODULE 5 — TRAINEE IMPLEMENTATION
 * ============================================================
 * Implement the following endpoints:
 *
 * GET    /calendar/team              — Team leaves for a given month/year (manager, hr_admin)
 * GET    /calendar/my                — Own leaves for a year (any)
 * GET    /public-holidays            — List public holidays (hr_admin)
 * POST   /public-holidays            — Create a public holiday (hr_admin)
 * DELETE /public-holidays/:id        — Delete a public holiday (hr_admin)
 *
 * Query params: ?month=4&year=2026 for team, ?year=2026 for my
 */
@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}
}
