import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { User } from '../../shared/interfaces/user.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Create a new employee (HR Admin only)' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List employees (role-scoped)' })
  findAll(@CurrentUser() user: User) {
    return this.employeesService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single employee' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Update employee details (HR Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Put(':id/deactivate')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Deactivate an employee (HR Admin only)' })
  deactivate(@Param('id') id: string) {
    return this.employeesService.deactivate(id);
  }
}
