import { Module } from '@nestjs/common';
import { LeavePoliciesController } from './leave-policies.controller';
import { LeavePoliciesService } from './leave-policies.service';

@Module({
  providers: [LeavePoliciesService],
  controllers: [LeavePoliciesController],
  exports: [LeavePoliciesService],
})
export class LeavePoliciesModule {}
