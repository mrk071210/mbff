import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Query,
  Response,
} from '@nestjs/common';
import { ProofreadService } from './proofread.service';
import { AiCheckService } from './aiCheck.service';
import { CreateProofreadDto } from './dto/create-proofread.dto';
import { UpdateProofreadDto } from './dto/update-proofread.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from './utils/storage';
import getDocxContext from './utils/docx-utils/getDocxContext';
import * as path from 'path';
import * as fs from 'fs';
import moment from 'moment-es6';
import { UpdateTaskDto } from './dto/update-task.dto';
import { createReadStream } from 'fs';
import { zip } from 'compressing';

@Controller('proofread')
export class ProofreadController {
  constructor(
    private readonly proofreadService: ProofreadService,
    private readonly aiCheckService: AiCheckService,
  ) {}

  @Post()
  create(@Body() createProofreadDto: CreateProofreadDto) {
    return this.proofreadService.create(createProofreadDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProofreadDto: UpdateProofreadDto,
  ) {
    return this.proofreadService.update(+id, updateProofreadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proofreadService.remove(+id);
  }

  @Post('uploadDocCheck')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storage,
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body) {
    const { token } = body;
    fs.rename(
      path.join(
        process.cwd(),
        `proofread-uploads/${moment().format('YYYYMM')}/${decodeURI(
          file.originalname,
        )}`,
      ),
      path.join(
        process.cwd(),
        `proofread-uploads/${moment().format('YYYYMM')}/${token}_${decodeURI(
          file.originalname,
        )}`,
      ),
      (err) => console.log(err),
    );

    const newProofread = {
      fileName: decodeURI(file.originalname),
      fileToken: token,
    };

    const result = await this.proofreadService.createTask(newProofread);
    if (result) {
      // try {
      const fileName = `${token}_${decodeURI(file.originalname)}`;
      //   const createFlag: any = await getDocxContext(
      //     path.join(
      //       process.cwd(),
      //       `proofread-uploads/${moment().format('YYYYMM')}/${fileName}`,
      //     ),
      //     fileName,
      //   );
      //   console.log(3, createFlag);
      //   if (createFlag === 'success') {
      //     this.updateTask({
      //       taskId: result.taskId,
      //       taskStatus: 2,
      //     });
      //     return { flag: true, message: '任务创建成功' };
      //   }
      // } catch (e) {
      //   return {
      //     flag: false,
      //     message: '任务创建异常，请重试',
      //   };
      // }
      this.aiCheckService.getDocxContext(
        path.join(
          process.cwd(),
          `proofread-uploads/${moment().format('YYYYMM')}/${fileName}`,
        ),
        fileName,
        result.taskId,
      );
      return {
        flag: true,
        message: '任务运行中',
      };
    } else {
      return { flag: false, message: '任务创建异常，请重试' };
    }
  }

  updateTask = (updateInfo: UpdateTaskDto) => {
    return this.proofreadService.updateTask({
      taskId: updateInfo.taskId,
      taskStatus: updateInfo.taskStatus,
    });
  };

  @Get('queryTask')
  async queryTask() {
    const taskresult = await this.proofreadService.findAll();
    return {
      list: taskresult[0],
      total: taskresult[1],
    };
  }

  @Get('download')
  async downloadFile(
    @Response({ passthrough: true }) res,
    @Query('token') token: string,
  ) {
    const file = createReadStream(
      path.join(
        process.cwd(),
        `proofread-downloads/${moment().format('YYYYMM')}`,
        `智能纠错_${token}`,
      ),
    );

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition':
        'attachment; filename="' +
        encodeURIComponent('智能纠错_' + token) +
        '"',
    });
    return new StreamableFile(file);
  }
}
