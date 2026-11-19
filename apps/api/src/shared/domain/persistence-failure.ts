/** Infrastructure-independent failure exposed by repository ports for unexpected DB errors. */
export class PersistenceFailure extends Error {
  constructor() { super('Persistence operation failed'); this.name = 'PersistenceFailure'; }
}
