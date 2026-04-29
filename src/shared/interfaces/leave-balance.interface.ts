export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalAllocated: number;
  carryForward: number;
  used: number;
  readonly remaining: number; // computed: totalAllocated + carryForward - used
  createdAt: Date;
}
