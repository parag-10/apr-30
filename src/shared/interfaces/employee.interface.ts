export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  designation: string;
  departmentId: string;
  managerId: string | null;
  joiningDate: string; // ISO date string YYYY-MM-DD
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
