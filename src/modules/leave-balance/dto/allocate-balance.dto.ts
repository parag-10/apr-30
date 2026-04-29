import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AllocateBalanceDto {
  @ApiProperty({ example: 2026 })
  @IsNumber()
  @Min(2020)
  year!: number;
}
