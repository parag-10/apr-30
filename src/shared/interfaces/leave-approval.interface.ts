export interface LeaveApproval {
  id: string;
  leaveRequestId: string;
  approverEmployeeId: string;
  action: 'approved' | 'rejected';
  comments: string;
  actionDate: Date;
}
