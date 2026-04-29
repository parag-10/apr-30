import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LeaveBalanceModule } from './modules/leave-balance/leave-balance.module';
import { LeavePoliciesModule } from './modules/leave-policies/leave-policies.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { LeaveTypesModule } from './modules/leave-types/leave-types.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SeedModule } from './seed/seed.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StoreModule,
    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    LeaveTypesModule,
    LeavePoliciesModule,
    LeaveBalanceModule,
    LeaveRequestsModule,
    CalendarModule,
    ReportsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
