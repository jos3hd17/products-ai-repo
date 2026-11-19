import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, RequestHandler, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { errorStatus } from '../filters/api-exception.filter';
export type AuditRequest = Request & {correlationId?:string;userId?:string};
export interface AuditEvent {event:'http_request'|'security_operation';correlationId:string;userId:string|null;route:string;method:string;durationMs:number;status:number;outcome:'success'|'failure'}
export type AuditSink = (event:AuditEvent)=>void;
export const defaultAuditSink:AuditSink = event=>console.log(JSON.stringify(event));
function emit(sink:AuditSink,req:AuditRequest,event:AuditEvent['event'],status:number,start:number):void {
  // Only allowlisted metadata. Never include body, headers, URL query, cookie or exception.
  const route:unknown=(req.route as {path?:unknown}|undefined)?.path;
  try { sink({event,correlationId:req.correlationId ?? 'unavailable',userId:req.userId ?? null,
    route:typeof route==='string'?route:'unmatched',method:req.method,durationMs:Math.max(0,performance.now()-start),
    status,outcome:status<400?'success':'failure'}); } catch { /* Audit transport failure cannot alter business responses. */ }
}
export function requestAuditMiddleware(sink:AuditSink):RequestHandler {
  return (req:AuditRequest,res:Response,next)=>{
    req.correlationId=randomUUID();res.setHeader('x-correlation-id',req.correlationId);
    const start=performance.now();
    // Runs even when a guard rejects before interceptors execute.
    res.once('finish',()=>emit(sink,req,'http_request',res.statusCode,start));next();
  };
}
@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  constructor(private readonly sink:AuditSink = defaultAuditSink) {}
  intercept(context:ExecutionContext,next:CallHandler):Observable<unknown> {
    const req=context.switchToHttp().getRequest<AuditRequest>();
    const res=context.switchToHttp().getResponse<Response>();
    const start=performance.now();
    return next.handle().pipe(tap({next:()=>emit(this.sink,req,'security_operation',res.statusCode,start),
      error:(error:unknown)=>emit(this.sink,req,'security_operation',errorStatus(error),start)}));
  }
}
