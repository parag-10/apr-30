import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveType } from '../../shared/interfaces/leave-type.interface';
import { InMemoryStore } from '../../store/in-memory.store';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly store: InMemoryStore) {}

  create(dto: CreateLeaveTypeDto): LeaveType {
    const leaveType: LeaveType = {
      id: this.store.generateId(),
      name: dto.name,
      description: dto.description ?? '',
      isPaid: dto.isPaid,
      isActive: true,
    };
    this.store.leaveTypes.push(leaveType);
    return leaveType;
  }

  findAll(): LeaveType[] {
    return this.store.leaveTypes.filter((lt) => lt.isActive);
  }

  findOne(id: string): LeaveType {
    const lt = this.store.leaveTypes.find((t) => t.id === id);
    if (!lt) throw new NotFoundException(`Leave type ${id} not found`);
    return lt;
  }

  remove(id: string): void {
    this.findOne(id);

    // ⚠️ BUG-14 is planted here — hard deletes without checking active requests
    this.store.leaveTypes = this.store.leaveTypes.filter((lt) => lt.id !== id);
  }
}
