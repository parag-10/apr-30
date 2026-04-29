import { Module } from '@nestjs/common';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';

@Module({
  providers: [LeaveTypesService],
  controllers: [LeaveTypesController],
  exports: [LeaveTypesService],
})
export class LeaveTypesModule {}
