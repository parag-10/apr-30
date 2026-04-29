import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveRejectDto {
  @ApiPropertyOptional({ description: 'Required when rejecting a request' })
  @IsOptional()
  @IsString()
  comments?: string;
}
