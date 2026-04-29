import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { UpsertLeavePolicyDto } from './dto/upsert-leave-policy.dto';
import { LeavePoliciesService } from './leave-policies.service';

@ApiTags('Leave Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr_admin')
@Controller('leave-policies')
export class LeavePoliciesController {
  constructor(private readonly leavePoliciesService: LeavePoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List all leave policies (HR Admin only)' })
  findAll() {
    return this.leavePoliciesService.findAll();
  }

  @Put(':leaveTypeId')
  @ApiOperation({
    summary: 'Create or update policy for a leave type (HR Admin only)',
  })
  upsert(
    @Param('leaveTypeId') leaveTypeId: string,
    @Body() dto: UpsertLeavePolicyDto,
  ) {
    return this.leavePoliciesService.upsert(leaveTypeId, dto);
  }
}
