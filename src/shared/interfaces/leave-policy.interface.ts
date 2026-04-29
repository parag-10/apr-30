export interface LeavePolicy {
  id: string;
  leaveTypeId: string;
  allowedDaysPerYear: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  createdAt: Date;
  updatedAt: Date;
}
