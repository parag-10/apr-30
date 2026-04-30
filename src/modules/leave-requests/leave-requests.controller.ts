import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ApproveRejectDto } from './dto/approve-reject.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { FilterRequestsDto } from './dto/filter-requests.dto';
import { SubmitOnBehalfDto } from './dto/submit-on-behalf.dto';
import { LeaveRequestsService } from './leave-requests.service';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a leave request' })
  submit(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.leaveRequestsService.submit(dto, user);
  }

  @Post('on-behalf')
  @UseGuards(RolesGuard)
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Submit a leave request on behalf of an employee (HR Admin only)' })
  submitOnBehalf(
    @Body() dto: SubmitOnBehalfDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.leaveRequestsService.submitOnBehalf(dto, user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Get leave requests — role-aware: employee→own, manager→team, hr_admin→all (filterable)',
  })
  getRequests(
    @Query() filters: FilterRequestsDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.leaveRequestsService.getRequests(filters, user);
  }

  @Put(':id/action')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr_admin')
  @ApiOperation({ summary: 'Approve or reject a leave request (Manager / HR Admin)' })
  action(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.leaveRequestsService.action(id, dto, user);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a leave request (own: employee/manager; any: hr_admin)' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.leaveRequestsService.cancel(id, user);
  }
}
