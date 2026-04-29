import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { User } from '../../shared/interfaces/user.interface';
import { EmployeesService } from '../employees/employees.service';
import { AllocateBalanceDto } from './dto/allocate-balance.dto';
import { LeaveBalanceService } from './leave-balance.service';

@ApiTags('Leave Balance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-balance')
export class LeaveBalanceController {
  constructor(
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'Get own leave balances for a year' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getMyBalance(@CurrentUser() user: User, @Query('year') year?: string) {
    const employee = this.employeesService.getByUserId(user.id);
    if (!employee) return [];
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.leaveBalanceService.getBalancesForEmployee(
      employee.id,
      targetYear,
    );
  }

  @Get('employee/:id')
  @Roles('hr_admin', 'manager')
  @ApiOperation({
    summary: 'Get balances for a specific employee (HR Admin, Manager)',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getEmployeeBalance(@Param('id') id: string, @Query('year') year?: string) {
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.leaveBalanceService.getBalancesForEmployee(id, targetYear);
  }

  @Post('allocate')
  @Roles('hr_admin')
  @ApiOperation({
    summary: 'Allocate yearly balances for all active employees (HR Admin)',
  })
  allocate(@Body() dto: AllocateBalanceDto) {
    return this.leaveBalanceService.allocateYearlyBalances(dto.year);
  }
}
