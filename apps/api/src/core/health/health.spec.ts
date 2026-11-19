import { setupHealth } from './health';
import { INestApplication } from '@nestjs/common';
function fixture(readyState = 1, error = false) {
  const command = jest.fn().mockImplementation(async () => { if (error) throw new Error('private connection detail'); return {ok:1}; });
  const connection = {readyState,db:{admin:()=>({command})}};
  let handler: (_request:unknown,response:unknown)=>Promise<void>;
  const app = {get:()=>connection,getHttpAdapter:()=>({get:(path:string,callback:typeof handler)=>{expect(path).toBe('/healthz');handler=callback;}})} as unknown as INestApplication;
  setupHealth(app);
  const json=jest.fn();const status=jest.fn().mockReturnValue({json});
  return {run:()=>handler(undefined,{status}),command,status,json};
}
it('reports ready only after an actual bounded database ping',async()=>{
  const f=fixture();await f.run();expect(f.command).toHaveBeenCalledWith({ping:1},{timeoutMS:2000});expect(f.status).toHaveBeenCalledWith(200);expect(f.json).toHaveBeenCalledWith({status:'ok'});
});
it('reports a disconnected database without issuing a ping',async()=>{
  const f=fixture(0);await f.run();expect(f.command).not.toHaveBeenCalled();expect(f.status).toHaveBeenCalledWith(503);
});
it('sanitizes database ping failures',async()=>{
  const f=fixture(1,true);await f.run();expect(f.status).toHaveBeenCalledWith(503);expect(f.json).toHaveBeenCalledWith({status:'unavailable'});
});
