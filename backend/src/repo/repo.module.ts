import { Module } from '@nestjs/common';
import { RepoController } from './repo.controller';
import { ProfilesController } from './profiles.controller';
import { RepoService } from './repo.service';

@Module({
  controllers: [RepoController, ProfilesController],
  providers: [RepoService],
})
export class RepoModule {}
