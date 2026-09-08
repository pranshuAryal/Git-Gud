import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RepoService } from './repo.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly repoService: RepoService) {}

  @Get(':userId')
  getProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.getUserProfile(user.userId, userId);
  }
}
