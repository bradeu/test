import { UserService } from './services/userService';
import { createLogger } from './utils/logger';

const logger = createLogger('dummy-ts');
const userService = new UserService(logger);

async function main(): Promise<void> {
  const users = await userService.listActiveUsers();
  logger.info(`Loaded ${users.length} active users`);
}

main().catch((error) => {
  logger.error(error instanceof Error ? error.message : String(error));
});
