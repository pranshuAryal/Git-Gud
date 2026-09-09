import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RepoModule } from './repo/repo.module';
import { MergeRequestModule } from './merge-request/merge-request.module';

@Module({
  imports: [AuthModule, PrismaModule, RepoModule, MergeRequestModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
