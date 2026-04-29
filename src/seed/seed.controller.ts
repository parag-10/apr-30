import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../shared/decorators/public.decorator';
import { SeedResult, SeedService } from './seed.service';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Seed the in-memory store with initial data',
    description:
      'Creates departments, leave types, policies, 1 hr_admin, 2 managers and 3 employees. Returns credentials for all seeded accounts. Can only be called once per server lifecycle.',
  })
  @ApiResponse({ status: 200, description: 'Seed successful — returns all credentials' })
  @ApiResponse({ status: 400, description: 'Store has already been seeded' })
  seed(): Promise<SeedResult> {
    return this.seedService.seed();
  }
}
