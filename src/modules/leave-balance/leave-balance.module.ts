import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [EmployeesModule],
  providers: [LeaveBalanceService],
  controllers: [LeaveBalanceController],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
