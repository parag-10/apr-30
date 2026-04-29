import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { LeaveTypesService } from './leave-types.service';

@ApiTags('Leave Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Create leave type (HR Admin only)' })
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active leave types' })
  findAll() {
    return this.leaveTypesService.findAll();
  }

  @Delete(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Delete leave type (HR Admin only)' })
  remove(@Param('id') id: string) {
    this.leaveTypesService.remove(id);
    return { message: 'Leave type deleted' };
  }
}
