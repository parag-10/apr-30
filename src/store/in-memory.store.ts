import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Department } from '../shared/interfaces/department.interface';
import { Employee } from '../shared/interfaces/employee.interface';
import { LeaveApproval } from '../shared/interfaces/leave-approval.interface';
import { LeaveBalance } from '../shared/interfaces/leave-balance.interface';
import { LeavePolicy } from '../shared/interfaces/leave-policy.interface';
import { LeaveRequest } from '../shared/interfaces/leave-request.interface';
import { LeaveType } from '../shared/interfaces/leave-type.interface';
import { PublicHoliday } from '../shared/interfaces/public-holiday.interface';
import { ResetToken } from '../shared/interfaces/reset-token.interface';
import { User } from '../shared/interfaces/user.interface';

@Injectable()
export class InMemoryStore {
  users: User[] = [];
  employees: Employee[] = [];
  departments: Department[] = [];
  leaveTypes: LeaveType[] = [];
  leavePolicies: LeavePolicy[] = [];
  leaveBalances: LeaveBalance[] = [];
  leaveRequests: LeaveRequest[] = [];
  leaveApprovals: LeaveApproval[] = [];
  publicHolidays: PublicHoliday[] = [];
  resetTokens: ResetToken[] = [];

  generateId(): string {
    return uuidv4();
  }

  now(): Date {
    return new Date();
  }
}
