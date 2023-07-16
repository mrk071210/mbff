import { Controller, Get } from '@nestjs/common';

@Controller('qiuqiu')
export class QiuqiuController {
  @Get()
  getHello(): string {
    return '213123';
  }
}
