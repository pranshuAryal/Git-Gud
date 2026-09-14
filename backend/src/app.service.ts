import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'gitgud-api',
      uptime: Math.round(process.uptime()),
    };
  }
}
