import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
/** Operational readiness only; no credentials, database details or business response. */
export function setupHealth(app: INestApplication): void {
  const connection = app.get<Connection>(getConnectionToken());
  app.getHttpAdapter().get('/healthz', async (_request: unknown, response: {status(code:number):{json(body:object):void}}) => {
    try {
      if (connection.readyState !== 1 || !connection.db) throw new Error('Not ready');
      await connection.db.admin().command({ping:1}, {timeoutMS:2000});
      response.status(200).json({status:'ok'});
    } catch {
      response.status(503).json({status:'unavailable'});
    }
  });
}
