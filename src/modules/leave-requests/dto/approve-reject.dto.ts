import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ApproveRejectDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  action!: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Required when rejecting a request' })
  @IsOptional()
  @IsString()
  comments?: string;
}
