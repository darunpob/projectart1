import type { Database } from '../db/database.js';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

export interface UserCredentials {
  user: User;
  passwordHash: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.created_at,
});

export class UsersRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  create(email: string, name: string, passwordHash: string): User {
    const row = this.#db
      .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) RETURNING *')
      .get(email, name, passwordHash) as UserRow;
    return toUser(row);
  }

  findById(id: number): User | null {
    const row = this.#db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findCredentialsByEmail(email: string): UserCredentials | null {
    const row = this.#db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
  }

  emailExists(email: string): boolean {
    return this.#db.prepare('SELECT 1 FROM users WHERE email = ?').get(email) !== undefined;
  }
}
