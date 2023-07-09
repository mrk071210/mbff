import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({
    message: '文件名不能为空',
  })
  fileName: string;
  @IsString()
  @IsNotEmpty()
  fileToken: string;
}
