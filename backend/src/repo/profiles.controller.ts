import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { RepoService, AVATARS_DIR, UploadedAvatarFile } from './repo.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

mkdirSync(AVATARS_DIR, { recursive: true });

const AVATAR_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const avatarStorage = diskStorage({
  destination: AVATARS_DIR,
  filename: (_req, file, cb) => {
    const ext =
      AVATAR_EXT[file.mimetype] ||
      extname(file.originalname).toLowerCase() ||
      '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const avatarFileFilter = (
  _req: unknown,
  file: UploadedAvatarFile,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new BadRequestException('Only image files are allowed'), false);
};

const avatarLimits = { fileSize: 5 * 1024 * 1024 };

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

  @Post(':userId/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: avatarFileFilter,
      limits: avatarLimits,
    }),
  )
  uploadAvatar(
    @Param('userId') userId: string,
    @UploadedFile() file: UploadedAvatarFile | undefined,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.repoService.uploadUserAvatar(user.userId, userId, file);
  }

  @Delete(':userId/avatar')
  deleteAvatar(
    @Param('userId') userId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.repoService.deleteUserAvatar(user.userId, userId);
  }
}
