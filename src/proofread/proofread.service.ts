import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CreateProofreadDto } from './dto/create-proofread.dto';
import { UpdateProofreadDto } from './dto/update-proofread.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { Proofread } from './entities/proofread.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ProofreadService {
  private logger = new Logger();

  @InjectRepository(Proofread)
  private proofreadRepository: Repository<Proofread>;

  create(createProofreadDto: CreateProofreadDto) {
    return 'This action adds a new proofread';
  }

  async findAll() {
    return await this.proofreadRepository.findAndCount({
      order: { createTime: 'desc' },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} proofread`;
  }

  update(id: number, updateProofreadDto: UpdateProofreadDto) {
    return `This action updates a #${id} proofread`;
  }

  remove(id: number) {
    return `This action removes a #${id} proofread`;
  }

  async createTask(task: CreateTaskDto) {
    const fondTask = await this.proofreadRepository.findOneBy({
      fileToken: task.fileToken,
    });

    if (fondTask) {
      throw new HttpException({ message: '文件已存在', code: 700000 }, 200);
    }

    const newProofread = new Proofread();
    newProofread.fileName = task.fileName;
    newProofread.fileToken = task.fileToken;
    newProofread.taskStatus = 1;
    try {
      const newTask = await this.proofreadRepository.save(newProofread);
      return newTask;
    } catch (e) {
      this.logger.error(e, ProofreadService);
      return false;
    }
  }

  async updateTask(updateInfo: UpdateTaskDto) {
    const fondTask = await this.proofreadRepository.findOneBy({
      taskId: updateInfo.taskId,
    });

    if (!fondTask) {
      this.logger.error(
        { message: `taskId：${updateInfo.taskId}任务不存在` },
        ProofreadService,
      );
      return false;
    } else {
      const saveResult = await this.proofreadRepository.save({
        ...fondTask,
        taskStatus: updateInfo.taskStatus,
      });
      return saveResult;
    }
  }
}
