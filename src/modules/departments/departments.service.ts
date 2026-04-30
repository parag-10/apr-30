import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Department } from '../../shared/interfaces/department.interface';
import { InMemoryStore } from '../../store/in-memory.store';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly store: InMemoryStore) {}

  create(dto: CreateDepartmentDto): Department {
    const dept: Department = {
      id: this.store.generateId(),
      name: dto.name,
      description: dto.description ?? '',
      isActive: true,
      createdAt: this.store.now(),
    };
    this.store.departments.push(dept);
    return dept;
  }

  findAll(): Department[] {
    return this.store.departments;
  }

  findAllActive(): Department[] {
    return this.store.departments.filter((d) => d.isActive);
  }

  findOne(id: string): Department {
    const dept = this.store.departments.find((d) => d.id === id);
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  update(id: string, dto: UpdateDepartmentDto): Department {
    const dept = this.findOne(id);
    Object.assign(dept, dto);
    return dept;
  }

  remove(id: string): void {
    this.findOne(id); // throws if not found

    const assignedEmployees = this.store.employees.filter(
      (e) => e.departmentId === id,
    );
    if (assignedEmployees.length > 0) {
      throw new ConflictException(
        `Cannot delete department: ${assignedEmployees.length} employee(s) are still assigned to it.`,
      );
    }

    this.store.departments = this.store.departments.filter((d) => d.id !== id);
  }
}
