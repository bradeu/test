import type { Logger } from '../utils/logger';
import { normalizeEmail } from '../utils/strings';

export interface User {
  id: string;
  email: string;
  active: boolean;
}

export type UserSummary = Pick<User, 'id' | 'email'>;

const seedUsers: User[] = [
  { id: 'u_001', email: 'ADA@EXAMPLE.COM', active: true },
  { id: 'u_002', email: 'grace@example.com', active: false },
  { id: 'u_003', email: 'linus@example.com', active: true }
];

/**
 * Small service with class, methods, imports, exports, and type-only import.
 */
export class UserService {
  constructor(private readonly logger: Logger) {}

  async listActiveUsers(): Promise<UserSummary[]> {
    this.logger.info('Listing active users');

    return seedUsers
      .filter((user) => user.active)
      .map((user) => ({
        id: user.id,
        email: normalizeEmail(user.email)
      }));
  }
}
