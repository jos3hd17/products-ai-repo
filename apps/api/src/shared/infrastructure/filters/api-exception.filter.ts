import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../../domain/domain-error';
const domainStatuses = {INVALID_INPUT:400, NOT_FOUND:404, UNAUTHORIZED:401, FORBIDDEN:403, CONFLICT:409} as const;
const statusCodes: Record<number,string> = {400:'INVALID_INPUT',401:'UNAUTHORIZED',403:'FORBIDDEN',404:'NOT_FOUND',409:'CONFLICT',413:'PAYLOAD_TOO_LARGE',429:'RATE_LIMITED',500:'INTERNAL_ERROR'};
export function errorStatus(error: unknown): number {
  if (error instanceof DomainError) return domainStatuses[error.code];
  if (error instanceof HttpException) return error.getStatus();
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') return 400;
    if (error.type === 'entity.too.large') return 413;
  }
  return 500;
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & {correlationId?:string}>();
    // Body-parser errors are external objects, not Nest exceptions; never echo their bodies.
    const status = errorStatus(error);
    let message: string | string[] = status === 400 ? 'Invalid request body' : status === 413 ? 'Request body too large' : 'An unexpected error occurred';
    if (error instanceof DomainError) message = error.message;
    else if (error instanceof HttpException && status < 500) {
      const response = error.getResponse();
      if (typeof response === 'string') message = response;
      else if ('message' in response && (typeof response.message === 'string' || (Array.isArray(response.message) && response.message.every((x:unknown)=>typeof x === 'string')))) message = response.message;
    }
    res.status(status).json({statusCode:status,code:statusCodes[status] ?? 'REQUEST_FAILED',message,correlationId:req.correlationId ?? null});
  }
}
