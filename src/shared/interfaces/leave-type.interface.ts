export interface LeaveType {
  id: string;
  name: string; // Annual | Sick | Casual | Unpaid
  description: string;
  isPaid: boolean;
  isActive: boolean;
}
