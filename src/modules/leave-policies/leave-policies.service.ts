import { Injectable, NotFoundException } from '@nestjs/common';
import { LeavePolicy } from '../../shared/interfaces/leave-policy.interface';
import { InMemoryStore } from '../../store/in-memory.store';
import { UpsertLeavePolicyDto } from './dto/upsert-leave-policy.dto';

@Injectable()
export class LeavePoliciesService {
  constructor(private readonly store: InMemoryStore) {}

  findAll(): LeavePolicy[] {
    return this.store.leavePolicies;
  }

  findByLeaveType(leaveTypeId: string): LeavePolicy | undefined {
    return this.store.leavePolicies.find((p) => p.leaveTypeId === leaveTypeId);
  }

  upsert(leaveTypeId: string, dto: UpsertLeavePolicyDto): LeavePolicy {
    const leaveType = this.store.leaveTypes.find(
      (lt) => lt.id === leaveTypeId && lt.isActive,
    );
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const existing = this.store.leavePolicies.find(
      (p) => p.leaveTypeId === leaveTypeId,
    );

    if (existing) {
      Object.assign(existing, { ...dto, updatedAt: this.store.now() });
      return existing;
    }

    const policy: LeavePolicy = {
      id: this.store.generateId(),
      leaveTypeId,
      allowedDaysPerYear: dto.allowedDaysPerYear,
      carryForwardAllowed: dto.carryForwardAllowed,
      maxCarryForwardDays: dto.maxCarryForwardDays,
      createdAt: this.store.now(),
      updatedAt: this.store.now(),
    };
    this.store.leavePolicies.push(policy);
    return policy;
  }
}
