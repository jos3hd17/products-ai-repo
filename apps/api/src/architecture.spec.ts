import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import ts from 'typescript';
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(e => e.isDirectory() ? sources(join(directory, e.name)) : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [join(directory, e.name)] : []);
}
function imports(file: string): { path: string; bindings: string[] }[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result: { path: string; bindings: string[] }[] = [];
  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined;
      result.push({ path: node.moduleSpecifier.text, bindings: clause && ts.isNamedImports(clause) ? clause.elements.map(e => e.propertyName?.text ?? e.name.text) : [] });
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
      result.push({ path: node.arguments[0] && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : '<dynamic-import>', bindings: [] });
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) result.push({ path: node.argument.literal.text, bindings: [] });
    ts.forEachChild(node, visit);
  }
  visit(source); return result;
}
const modules = join(__dirname, 'modules');
it('keeps domains independent from all frameworks and outward layers', () => {
  for (const name of ['products', 'auth']) for (const file of sources(join(modules, name, 'domain'))) {
    for (const item of imports(file)) {
      expect(item.path.startsWith('.')).toBe(true);
      expect(item.path).not.toMatch(/application|infrastructure|core|@nestjs|mongoose|mongodb|express|swagger/);
      const destination = relative(join(modules, name, 'domain'), resolve(file, '..', item.path));
      expect(!destination.startsWith('..') || resolve(file, '..', item.path).startsWith(join(__dirname, 'shared/domain') + '/')).toBe(true);
    }
  }
});
it('allows only the explicit CQRS/Inject compromise in application handlers', () => {
  for (const name of ['products', 'auth']) for (const file of sources(join(modules, name, 'application'))) {
    for (const item of imports(file)) {
      expect(item.path).not.toMatch(/infrastructure|mongoose|mongodb|express|swagger|\/core\//);
      if (item.path.startsWith('.')) continue;
      expect(file.endsWith('.handler.ts')).toBe(true);
      expect(['@nestjs/common', '@nestjs/cqrs']).toContain(item.path);
      expect(item.bindings.length).toBeGreaterThan(0);
      for (const binding of item.bindings) expect(item.path === '@nestjs/common' ? ['Inject'] : ['CommandHandler', 'QueryHandler', 'ICommandHandler', 'IQueryHandler']).toContain(binding);
    }
  }
});
it('keeps HTTP adapters on buses rather than repositories or direct workflows', () => {
  for (const name of ['products', 'auth']) for (const file of sources(join(modules, name, 'infrastructure/http/controllers'))) {
    const paths = imports(file); const bus = paths.find(item => item.path === '@nestjs/cqrs');
    expect(bus?.bindings.sort()).toEqual(['CommandBus', 'QueryBus']);
    expect(paths.map(item => item.path).join(' ')).not.toMatch(/use-cases|persistence|repositories|mongoose/);
    const text = readFileSync(file, 'utf8'); expect(text).toContain('this.commands.execute'); expect(text).toContain('this.queries.execute');
  }
});
it('centralizes connection configuration and leaves feature registration local', () => {
  const root = join(__dirname, 'core/database/database.module.ts');
  const declarations = [...sources(__dirname), ...sources(join(__dirname, '../scripts'))].filter(file => /MongooseModule\.forRoot(?:Async)?\(/.test(readFileSync(file, 'utf8')));
  expect(declarations).toEqual([root]);
  expect(readFileSync(root, 'utf8')).not.toContain('MongooseModule.forFeature');
  for (const name of ['auth', 'products']) {
    const text = readFileSync(join(modules, name, `${name}.module.ts`), 'utf8');
    expect(text).toContain('MongooseModule.forFeature'); expect(text).not.toContain('forRootAsync');
  }
  expect(readFileSync(join(__dirname, '../scripts/seed-demo.ts'), 'utf8')).toContain('DatabaseModule');
});
it('repository adapters explicitly implement their domain port contracts', () => {
  const definitions = [
    ['products', 'mongoose-product.repository.ts', 'ProductRepositoryPort'],
    ['auth', 'mongoose-user.repository.ts', 'UserRepositoryPort'],
    ['auth', 'mongoose-session.repository.ts', 'SessionRepositoryPort'],
  ];
  for (const [name, file, port] of definitions) {
    const path = join(modules, name, 'infrastructure/persistence/mongoose/repositories', file);
    expect(readFileSync(path, 'utf8')).toMatch(new RegExp(`implements\\s+${port}`));
    expect(imports(path).some(item => item.path.includes('domain/ports/'))).toBe(true);
  }
});
