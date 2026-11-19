import { LoginInput } from '../../dto/auth.contracts';
export class LoginCommand {
  constructor(public readonly input: LoginInput) {}
}
