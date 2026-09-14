import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RepoService } from './repo.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  @Patch(':userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.updateUserProfile(user.userId, userId, dto);
  }
}
