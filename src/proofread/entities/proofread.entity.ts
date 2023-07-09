import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Proofread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
    comment: '任务id',
  })
  @Generated('uuid')
  taskId: string;

  @Column({
    length: 50,
    comment: '文件token',
  })
  fileToken: string;

  @Column({
    length: 500,
    comment: '文件名',
  })
  fileName: string;

  @Column({
    comment: '任务状态',
  })
  taskStatus: number;

  @CreateDateColumn({
    comment: '创建时间',
  })
  createTime: Date;

  @UpdateDateColumn({
    comment: '更新时间',
  })
  updateTime: Date;
}
