import 'reflect-metadata';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { canonicalApiJson,exportApiDocument } from '../src/core/openapi/export-document';
async function main():Promise<void> {
  const output=resolve(__dirname,'../../../docs/api/openapi.json');
  const document=await exportApiDocument();
  // Validate a copy: Swagger Parser may dereference its input. External refs disabled.
  await SwaggerParser.validate(JSON.parse(JSON.stringify(document)),{resolve:{external:false}});
  const json=canonicalApiJson(document);
  if(process.argv.includes('--check')) {
    if(await readFile(output,'utf8')!==json) throw new Error('OpenAPI export is stale; run pnpm openapi:export');
    console.log('OpenAPI export matches current controller metadata and passes schema validation');
  } else {
    await mkdir(dirname(output),{recursive:true});await writeFile(output,json);console.log('Validated OpenAPI3 export written to docs/api/openapi.json');
  }
}
void main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:'OpenAPI export failed');process.exitCode=1;});
