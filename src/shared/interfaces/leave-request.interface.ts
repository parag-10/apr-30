export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  workingDays: number; // pre-calculated, excludes weekends + public holidays
  reason: string;
  status: LeaveRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
