import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Department } from '../shared/interfaces/department.interface';
import { Employee } from '../shared/interfaces/employee.interface';
import { LeavePolicy } from '../shared/interfaces/leave-policy.interface';
import { LeaveType } from '../shared/interfaces/leave-type.interface';
import { User } from '../shared/interfaces/user.interface';
import { InMemoryStore } from '../store/in-memory.store';

export interface SeedCredential {
  email: string;
  password: string;
  role: string;
  name: string;
}

export interface SeedResult {
  message: string;
  hr_admins: SeedCredential[];
  managers: SeedCredential[];
  employees: SeedCredential[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly store: InMemoryStore,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get('SEED_ON_START') !== 'true') return;
    await this.seed();
  }

  async seed(): Promise<SeedResult> {
    if (this.store.users.length > 0) {
      throw new BadRequestException('Store has already been seeded. Restart the server to reset.');
    }

    this.logger.log('Seeding in-memory store...');

    // ── Departments ────────────────────────────────────────────────────────
    const engineeringDept: Department = {
      id: this.store.generateId(),
      name: 'Engineering',
      description: 'Software engineering team',
      isActive: true,
      createdAt: this.store.now(),
    };
    const hrDept: Department = {
      id: this.store.generateId(),
      name: 'Human Resources',
      description: 'HR department',
      isActive: true,
      createdAt: this.store.now(),
    };
    const salesDept: Department = {
      id: this.store.generateId(),
      name: 'Sales',
      description: 'Sales team',
      isActive: true,
      createdAt: this.store.now(),
    };
    this.store.departments.push(engineeringDept, hrDept, salesDept);
    this.logger.log('  Departments seeded: Engineering, Human Resources, Sales');

    // ── Leave Types ────────────────────────────────────────────────────────
    const annualLeave: LeaveType = { id: this.store.generateId(), name: 'Annual',  description: 'Annual paid leave', isPaid: true,  isActive: true };
    const sickLeave:   LeaveType = { id: this.store.generateId(), name: 'Sick',    description: 'Sick leave',        isPaid: true,  isActive: true };
    const casualLeave: LeaveType = { id: this.store.generateId(), name: 'Casual',  description: 'Casual leave',      isPaid: true,  isActive: true };
    const unpaidLeave: LeaveType = { id: this.store.generateId(), name: 'Unpaid',  description: 'Unpaid leave',      isPaid: false, isActive: true };
    this.store.leaveTypes.push(annualLeave, sickLeave, casualLeave, unpaidLeave);
    this.logger.log('  Leave types seeded: Annual, Sick, Casual, Unpaid');

    // ── Leave Policies ─────────────────────────────────────────────────────
    const policies: LeavePolicy[] = [
      { id: this.store.generateId(), leaveTypeId: annualLeave.id, allowedDaysPerYear: 20, carryForwardAllowed: true,  maxCarryForwardDays: 5,  createdAt: this.store.now(), updatedAt: this.store.now() },
      { id: this.store.generateId(), leaveTypeId: sickLeave.id,   allowedDaysPerYear: 10, carryForwardAllowed: false, maxCarryForwardDays: 0,  createdAt: this.store.now(), updatedAt: this.store.now() },
      { id: this.store.generateId(), leaveTypeId: casualLeave.id, allowedDaysPerYear: 7,  carryForwardAllowed: false, maxCarryForwardDays: 0,  createdAt: this.store.now(), updatedAt: this.store.now() },
      { id: this.store.generateId(), leaveTypeId: unpaidLeave.id, allowedDaysPerYear: 30, carryForwardAllowed: false, maxCarryForwardDays: 0,  createdAt: this.store.now(), updatedAt: this.store.now() },
    ];
    this.store.leavePolicies.push(...policies);
    this.logger.log('  Leave policies seeded');

    // ── Helper ─────────────────────────────────────────────────────────────
    const makeUser = async (
      email: string,
      password: string,
      role: User['role'],
    ): Promise<User> => {
      const user: User = {
        id: this.store.generateId(),
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        isActive: true,
        createdAt: this.store.now(),
      };
      this.store.users.push(user);
      return user;
    };

    const makeEmployee = (
      userId: string,
      firstName: string,
      lastName: string,
      designation: string,
      departmentId: string,
      managerId: string | null,
      joiningDate: string,
    ): Employee => {
      const emp: Employee = {
        id: this.store.generateId(),
        userId,
        firstName,
        lastName,
        designation,
        departmentId,
        managerId,
        joiningDate,
        isActive: true,
        createdAt: this.store.now(),
        updatedAt: this.store.now(),
      };
      this.store.employees.push(emp);
      return emp;
    };

    // ── HR Admin (×1) ──────────────────────────────────────────────────────
    const adminPass = 'Admin@1234';
    const adminUser = await makeUser('admin@hrflow.com', adminPass, 'hr_admin');
    makeEmployee(adminUser.id, 'Admin', 'User', 'HR Director', hrDept.id, null, '2022-01-01');

    // ── Managers (×2) ─────────────────────────────────────────────────────
    const manager1Pass = 'Manager1@1234';
    const manager2Pass = 'Manager2@1234';
    const mgr1User = await makeUser('manager1@hrflow.com', manager1Pass, 'manager');
    const mgr2User = await makeUser('manager2@hrflow.com', manager2Pass, 'manager');
    const mgr1Emp = makeEmployee(mgr1User.id, 'Jane',  'Smith',   'Engineering Manager', engineeringDept.id, null, '2022-03-15');
    const mgr2Emp = makeEmployee(mgr2User.id, 'Carlos','Rivera',  'Sales Manager',       salesDept.id,       null, '2022-06-01');

    // ── Employees (×3) ────────────────────────────────────────────────────
    const emp1Pass = 'Employee1@1234';
    const emp2Pass = 'Employee2@1234';
    const emp3Pass = 'Employee3@1234';
    const emp1User = await makeUser('employee1@hrflow.com', emp1Pass, 'employee');
    const emp2User = await makeUser('employee2@hrflow.com', emp2Pass, 'employee');
    const emp3User = await makeUser('employee3@hrflow.com', emp3Pass, 'employee');
    makeEmployee(emp1User.id, 'John',  'Doe',    'Software Engineer',   engineeringDept.id, mgr1Emp.id, '2023-06-01');
    makeEmployee(emp2User.id, 'Alice', 'Johnson','Frontend Developer',  engineeringDept.id, mgr1Emp.id, '2023-09-01');
    makeEmployee(emp3User.id, 'Bob',   'Lee',    'Sales Representative',salesDept.id,       mgr2Emp.id, '2024-01-15');

    this.logger.log('Seeding complete! Users: 1 hr_admin, 2 managers, 3 employees');

    return {
      message: 'Seeding complete',
      hr_admins: [
        { email: 'admin@hrflow.com',    password: adminPass,    role: 'hr_admin',  name: 'Admin User' },
      ],
      managers: [
        { email: 'manager1@hrflow.com', password: manager1Pass, role: 'manager',   name: 'Jane Smith' },
        { email: 'manager2@hrflow.com', password: manager2Pass, role: 'manager',   name: 'Carlos Rivera' },
      ],
      employees: [
        { email: 'employee1@hrflow.com', password: emp1Pass, role: 'employee', name: 'John Doe' },
        { email: 'employee2@hrflow.com', password: emp2Pass, role: 'employee', name: 'Alice Johnson' },
        { email: 'employee3@hrflow.com', password: emp3Pass, role: 'employee', name: 'Bob Lee' },
      ],
    };
  }
}
