import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface Response<T> {
  data: T;
}
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getHandler().name === 'downloadFile') {
      return next.handle().pipe(
        tap(() => {
          console.log('下载纠错文件');
        }),
      );
    } else {
      return next.handle().pipe(
        map((data: any) => {
          return data?.directReturn
            ? data.value
            : {
                data,
                code: 0,
                message: 'success',
              };
        }),
      );
    }
  }
}
