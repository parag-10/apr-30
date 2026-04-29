import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Employee } from '../../shared/interfaces/employee.interface';
import { User } from '../../shared/interfaces/user.interface';
import { InMemoryStore } from '../../store/in-memory.store';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly store: InMemoryStore) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existingUser = this.store.users.find((u) => u.email === dto.email);
    if (existingUser) throw new ConflictException('Email already in use');

    const department = this.store.departments.find(
      (d) => d.id === dto.departmentId && d.isActive,
    );
    if (!department) throw new NotFoundException('Department not found');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const userId = this.store.generateId();

    const user: User = {
      id: userId,
      email: dto.email,
      passwordHash: hashedPassword,
      role: 'employee',
      isActive: true,
      createdAt: this.store.now(),
    };
    this.store.users.push(user);

    const employee: Employee = {
      id: this.store.generateId(),
      userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      designation: dto.designation,
      departmentId: dto.departmentId,
      managerId: dto.managerId ?? null,
      joiningDate: dto.joiningDate,
      isActive: true,
      createdAt: this.store.now(),
      updatedAt: this.store.now(),
    };
    this.store.employees.push(employee);
    return employee;
  }

  findAll(requestingUser: User): Employee[] {
    // ⚠️ BUG-06 is planted here — returns all records regardless of role
    return this.store.employees;
  }

  findOne(id: string): Employee {
    const employee = this.store.employees.find((e) => e.id === id);
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  getByUserId(userId: string): Employee | undefined {
    return this.store.employees.find((e) => e.userId === userId);
  }

  update(id: string, dto: UpdateEmployeeDto): Employee {
    const employee = this.findOne(id);

    // ⚠️ BUG-09 is planted here — self-reference check is removed
    if (dto.departmentId) {
      const dept = this.store.departments.find(
        (d) => d.id === dto.departmentId && d.isActive,
      );
      if (!dept) throw new NotFoundException('Department not found');
    }

    Object.assign(employee, { ...dto, updatedAt: this.store.now() });
    return employee;
  }

  deactivate(id: string): Employee {
    const employee = this.findOne(id);
    employee.isActive = false;
    employee.updatedAt = this.store.now();

    // ⚠️ BUG-08 is planted here — pending leaves are NOT cancelled on deactivation
    const user = this.store.users.find((u) => u.id === employee.userId);
    if (user) user.isActive = false;

    return employee;
  }
}
