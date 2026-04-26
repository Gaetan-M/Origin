import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponseShape<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseShape<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseShape<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
