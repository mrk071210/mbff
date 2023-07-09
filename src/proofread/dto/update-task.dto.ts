import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class UpdateTaskDto {
  @IsNotEmpty({
    message: '文件名id不能为空',
  })
  taskId: string;
  @IsNotEmpty()
  taskStatus: number;
}
