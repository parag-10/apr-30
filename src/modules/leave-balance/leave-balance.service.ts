import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employee } from '../../shared/interfaces/employee.interface';
import { LeaveBalance } from '../../shared/interfaces/leave-balance.interface';
import { InMemoryStore } from '../../store/in-memory.store';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly store: InMemoryStore) {}

  getBalancesForEmployee(employeeId: string, year: number): LeaveBalance[] {
    return this.store.leaveBalances.filter(
      (b) => b.employeeId === employeeId && b.year === year,
    );
  }

  getBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): LeaveBalance | undefined {
    return this.store.leaveBalances.find(
      (b) =>
        b.employeeId === employeeId &&
        b.leaveTypeId === leaveTypeId &&
        b.year === year,
    );
  }

  allocateYearlyBalances(year: number): { allocated: number } {
    const employees = this.store.employees.filter((e) => e.isActive);
    const policies = this.store.leavePolicies;
    let count = 0;

    employees.forEach((employee) => {
      policies.forEach((policy) => {
        const existing = this.getBalance(employee.id, policy.leaveTypeId, year);
        if (existing) return; // already allocated

        const totalAllocated = this.calculateAllocatedDays(
          employee,
          policy,
          year,
        );

        const balance = this.createBalance(
          employee.id,
          policy.leaveTypeId,
          year,
          totalAllocated,
        );
        this.store.leaveBalances.push(balance);
        count++;
      });
    });

    return { allocated: count };
  }

  private createBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    totalAllocated: number,
    carryForward = 0,
  ): LeaveBalance {
    const balance = {
      id: this.store.generateId(),
      employeeId,
      leaveTypeId,
      year,
      totalAllocated,
      carryForward,
      used: 0,
      createdAt: this.store.now(),
    };

    // Attach computed 'remaining' getter
    return Object.defineProperties(balance, {
      remaining: {
        get() {
          return this.totalAllocated + this.carryForward - this.used;
        },
        enumerable: true,
      },
    }) as LeaveBalance;
  }

  private calculateAllocatedDays(
    employee: Employee,
    policy: { allowedDaysPerYear: number },
    year: number,
  ): number {
    // ⚠️ BUG-11 is planted here — always returns full allocation (no pro-ration)
    return policy.allowedDaysPerYear;
  }

  deduct(
    employeeId: string,
    leaveTypeId: string,
    days: number,
    year: number,
  ): void {
    const balance = this.getBalance(employeeId, leaveTypeId, year);
    if (!balance) throw new NotFoundException('Leave balance not found');
    if (balance.remaining < days)
      throw new BadRequestException('Insufficient leave balance');
    balance.used += days;
  }

  restore(
    employeeId: string,
    leaveTypeId: string,
    days: number,
    year: number,
  ): void {
    const balance = this.getBalance(employeeId, leaveTypeId, year);
    if (!balance) return;
    balance.used = Math.max(0, balance.used - days);
  }

  processCarryForward(employeeId: string, fromYear: number): void {
    const balances = this.getBalancesForEmployee(employeeId, fromYear);

    balances.forEach((balance) => {
      const policy = this.store.leavePolicies.find(
        (p) => p.leaveTypeId === balance.leaveTypeId,
      );
      if (!policy || !policy.carryForwardAllowed) return;

      // ⚠️ BUG-13 is planted here — no cap applied on carry forward amount
      const carryAmount = balance.remaining; // BUG: should be Math.min(balance.remaining, policy.maxCarryForwardDays)

      if (carryAmount <= 0) return;

      const nextYearBalance = this.getBalance(
        employeeId,
        balance.leaveTypeId,
        fromYear + 1,
      );
      if (nextYearBalance) {
        nextYearBalance.carryForward += carryAmount;
      } else {
        const newBalance = this.createBalance(
          employeeId,
          balance.leaveTypeId,
          fromYear + 1,
          0,
          carryAmount,
        );
        this.store.leaveBalances.push(newBalance);
      }
    });
  }
}
