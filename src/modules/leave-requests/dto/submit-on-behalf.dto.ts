import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, MinLength } from 'class-validator';

export class SubmitOnBehalfDto {
  @ApiProperty({ description: 'Target employee ID to submit leave for' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  fromDate!: string;

  @ApiProperty({ example: '2026-05-05' })
  @IsDateString()
  toDate!: string;

  @ApiProperty({ example: 'Annual family vacation trip', minLength: 10 })
  @IsString()
  @MinLength(10)
  reason!: string;
}
