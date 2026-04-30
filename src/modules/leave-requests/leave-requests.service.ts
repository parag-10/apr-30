import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { EmployeesService } from '../employees/employees.service';
import { InMemoryStore } from '../../store/in-memory.store';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { SubmitOnBehalfDto } from './dto/submit-on-behalf.dto';
import { ApproveRejectDto } from './dto/approve-reject.dto';
import { FilterRequestsDto } from './dto/filter-requests.dto';
import { LeaveRequest } from '../../shared/interfaces/leave-request.interface';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly employeesService: EmployeesService,
  ) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private calculateWorkingDays(fromDate: string, toDate: string): number {
    const holidays = new Set(this.store.publicHolidays.map((h) => h.date));
    let count = 0;
    const current = new Date(fromDate);
    const end = new Date(toDate);
    while (current <= end) {
      const day = current.getDay();
      const iso = current.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !holidays.has(iso)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  private hasOverlap(
    employeeId: string,
    fromDate: string,
    toDate: string,
    excludeId?: string,
  ): boolean {
    return this.store.leaveRequests.some((r) => {
      if (r.employeeId !== employeeId) return false;
      if (excludeId && r.id === excludeId) return false;
      if (r.status !== 'pending' && r.status !== 'approved') return false;
      return r.fromDate <= toDate && r.toDate >= fromDate;
    });
  }

  private resolveEmployeeForUser(userId: string) {
    const employee = this.employeesService.getByUserId(userId);
    if (!employee) throw new NotFoundException('Employee record not found');
    if (!employee.isActive)
      throw new BadRequestException('Employee account is inactive');
    return employee;
  }

  private getRequestOrThrow(id: string): LeaveRequest {
    const req = this.store.leaveRequests.find((r) => r.id === id);
    if (!req) throw new NotFoundException(`Leave request ${id} not found`);
    return req;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  submit(dto: CreateLeaveRequestDto, currentUser: { sub: string }) {
    const employee = this.resolveEmployeeForUser(currentUser.sub);
    return this.createRequest(employee.id, dto);
  }

  submitOnBehalf(dto: SubmitOnBehalfDto, _currentUser: { sub: string }) {
    const employee = this.employeesService.findOne(dto.employeeId);
    if (!employee.isActive)
      throw new BadRequestException('Target employee account is inactive');
    return this.createRequest(employee.id, dto);
  }

  private createRequest(
    employeeId: string,
    dto: CreateLeaveRequestDto | SubmitOnBehalfDto,
  ) {
    const leaveType = this.store.leaveTypes.find(
      (t) => t.id === dto.leaveTypeId,
    );
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (!leaveType.isActive)
      throw new BadRequestException('Leave type is not active');

    if (dto.fromDate > dto.toDate)
      throw new BadRequestException('fromDate must be on or before toDate');

    const workingDays = this.calculateWorkingDays(dto.fromDate, dto.toDate);
    if (workingDays === 0)
      throw new BadRequestException(
        'Selected date range contains no working days',
      );

    const year = new Date(dto.fromDate).getFullYear();
    const balance = this.leaveBalanceService.getBalance(
      employeeId,
      dto.leaveTypeId,
      year,
    );
    if (!balance)
      throw new BadRequestException(
        'No leave balance allocated for this leave type and year',
      );
    if (balance.remaining < workingDays)
      throw new BadRequestException(
        `Insufficient leave balance: ${balance.remaining} day(s) remaining, ${workingDays} requested`,
      );

    if (this.hasOverlap(employeeId, dto.fromDate, dto.toDate))
      throw new BadRequestException(
        'Leave request overlaps with an existing pending or approved request',
      );

    const request: LeaveRequest = {
      id: this.store.generateId(),
      employeeId,
      leaveTypeId: dto.leaveTypeId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      workingDays,
      reason: dto.reason,
      status: 'pending',
      createdAt: this.store.now(),
      updatedAt: this.store.now(),
    };
    this.store.leaveRequests.push(request);
    return request;
  }

  // ─── Get (role-aware) ──────────────────────────────────────────────────────

  getRequests(
    filters: FilterRequestsDto,
    currentUser: { sub: string; role: string },
  ) {
    const { role } = currentUser;

    if (role === 'employee') {
      const employee = this.resolveEmployeeForUser(currentUser.sub);
      return this.store.leaveRequests.filter(
        (r) => r.employeeId === employee.id,
      );
    }

    if (role === 'manager') {
      const managerEmployee = this.resolveEmployeeForUser(currentUser.sub);
      const directReportIds = this.store.employees
        .filter((e) => e.managerId === managerEmployee.id && e.isActive)
        .map((e) => e.id);

      let results = this.store.leaveRequests.filter((r) =>
        directReportIds.includes(r.employeeId),
      );
      if (filters.status) results = results.filter((r) => r.status === filters.status);
      if (filters.fromDate) results = results.filter((r) => r.toDate >= filters.fromDate!);
      if (filters.toDate) results = results.filter((r) => r.fromDate <= filters.toDate!);
      return results;
    }

    // hr_admin — full filter set
    let results = [...this.store.leaveRequests];

    if (filters.employeeId)
      results = results.filter((r) => r.employeeId === filters.employeeId);

    if (filters.departmentId) {
      const empIds = this.store.employees
        .filter((e) => e.departmentId === filters.departmentId)
        .map((e) => e.id);
      results = results.filter((r) => empIds.includes(r.employeeId));
    }

    if (filters.status)
      results = results.filter((r) => r.status === filters.status);

    if (filters.fromDate)
      results = results.filter((r) => r.toDate >= filters.fromDate!);

    if (filters.toDate)
      results = results.filter((r) => r.fromDate <= filters.toDate!);

    return results;
  }

  // ─── Approve / Reject ──────────────────────────────────────────────────────

  action(
    id: string,
    dto: ApproveRejectDto,
    currentUser: { sub: string; role: string },
  ) {
    const request = this.getRequestOrThrow(id);

    if (request.status !== 'pending')
      throw new BadRequestException(
        `Only pending requests can be actioned (current status: ${request.status})`,
      );

    const approver = this.resolveEmployeeForUser(currentUser.sub);

    if (approver.id === request.employeeId)
      throw new ForbiddenException('You cannot action your own leave request');

    if (currentUser.role === 'manager') {
      const targetEmployee = this.employeesService.findOne(request.employeeId);
      if (targetEmployee.managerId !== approver.id)
        throw new ForbiddenException(
          'Managers can only action leave requests for their direct reports',
        );
    }

    if (dto.action === 'rejected') {
      if (!dto.comments || !dto.comments.trim())
        throw new BadRequestException(
          'A reason (comments) is required when rejecting a request',
        );
      request.status = 'rejected';
    } else {
      const year = new Date(request.fromDate).getFullYear();
      this.leaveBalanceService.deduct(
        request.employeeId,
        request.leaveTypeId,
        request.workingDays,
        year,
      );
      request.status = 'approved';
    }

    request.updatedAt = this.store.now();

    this.store.leaveApprovals.push({
      id: this.store.generateId(),
      leaveRequestId: request.id,
      approverEmployeeId: approver.id,
      action: dto.action,
      comments: dto.comments ?? '',
      actionDate: this.store.now(),
    });

    return request;
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  cancel(id: string, currentUser: { sub: string; role: string }) {
    const request = this.getRequestOrThrow(id);

    if (request.status !== 'pending' && request.status !== 'approved')
      throw new BadRequestException(
        `Only pending or approved requests can be cancelled (current status: ${request.status})`,
      );

    if (currentUser.role !== 'hr_admin') {
      const employee = this.resolveEmployeeForUser(currentUser.sub);
      if (employee.id !== request.employeeId)
        throw new ForbiddenException(
          'You can only cancel your own leave requests',
        );
    }

    if (request.status === 'approved') {
      const year = new Date(request.fromDate).getFullYear();
      this.leaveBalanceService.restore(
        request.employeeId,
        request.leaveTypeId,
        request.workingDays,
        year,
      );
    }

    request.status = 'cancelled';
    request.updatedAt = this.store.now();
    return request;
  }
}
