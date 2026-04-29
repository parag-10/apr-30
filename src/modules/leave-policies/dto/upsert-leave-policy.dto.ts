import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Min } from 'class-validator';

export class UpsertLeavePolicyDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  allowedDaysPerYear!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  carryForwardAllowed!: boolean;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  maxCarryForwardDays!: number;
}
