import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from '../http/http-error.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { User, UsersRepository } from './users.repository.js';

const BCRYPT_COST = 10;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  token: string;
  user: User;
}

const invalidCredentials = () => new HttpError(401, 'invalid_credentials', 'Email or password is incorrect');

export class AuthService {
  readonly #users: UsersRepository;
  readonly #jwtSecret: string;

  constructor(users: UsersRepository, jwtSecret: string) {
    this.#users = users;
    this.#jwtSecret = jwtSecret;
  }

  async register(input: RegisterInput): Promise<Session> {
    if (this.#users.emailExists(input.email)) {
      throw new HttpError(409, 'email_taken', 'An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = this.#users.create(input.email, input.name, passwordHash);
    return { token: this.#sign(user.id), user };
  }

  async login(input: LoginInput): Promise<Session> {
    const credentials = this.#users.findCredentialsByEmail(input.email);
    if (!credentials) throw invalidCredentials();

    const matches = await bcrypt.compare(input.password, credentials.passwordHash);
    if (!matches) throw invalidCredentials();

    return { token: this.#sign(credentials.user.id), user: credentials.user };
  }

  authenticate(token: string): User {
    const userId = this.#verify(token);
    const user = this.#users.findById(userId);
    if (!user) throw new HttpError(401, 'unauthorized', 'Account no longer exists');
    return user;
  }

  #sign(userId: number): string {
    return jwt.sign({ sub: String(userId) }, this.#jwtSecret, {
      algorithm: 'HS256',
      expiresIn: TOKEN_TTL_SECONDS,
    });
  }

  #verify(token: string): number {
    try {
      const claims = jwt.verify(token, this.#jwtSecret, { algorithms: ['HS256'] });
      const userId = typeof claims === 'object' ? Number(claims.sub) : Number.NaN;
      if (!Number.isInteger(userId)) throw new Error('Token subject is not a user id');
      return userId;
    } catch (cause) {
      throw new HttpError(401, 'unauthorized', `Invalid or expired token (${(cause as Error).message})`);
    }
  }
}
