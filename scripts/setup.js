const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('blue', '================================');
  log('blue', title);
  log('blue', '================================');
  console.log('');
}

function execute(command, description) {
  try {
    log('yellow', `${description}...`);
    execSync(command, { stdio: 'inherit' });
    log('green', `✓ ${description}`);
    return true;
  } catch (error) {
    log('red', `✗ ${description} failed`);
    return false;
  }
}

async function main() {
  logSection('RytExplorer API Setup');

  // Check if fresh start
  const isFreshStart = !fs.existsSync(path.join(__dirname, '../node_modules'));

  if (isFreshStart) {
    log('yellow', '🔧 Fresh start detected');
    if (!execute('pnpm install', 'Installing dependencies')) {
      process.exit(1);
    }
    console.log('');
  } else {
    log('yellow', 'ℹ️  Regular start - skipping dependency installation');
    console.log('');
  }

  // Stop existing containers
  log('yellow', '🛑 Stopping existing containers...');
  execute('docker-compose down', 'Stopping containers');
  console.log('');

  // Clean volumes on fresh start
  if (isFreshStart) {
    log('yellow', '🧹 Cleaning volumes for fresh start...');
    execute('docker-compose down -v', 'Cleaning volumes');
    console.log('');
  }

  // Start Docker
  if (!execute('docker-compose up -d', '🐳 Starting Docker containers')) {
    process.exit(1);
  }
  console.log('');

  // Wait for PostgreSQL
  log('yellow', '⏳ Waiting for PostgreSQL to be healthy...');
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      execSync('docker-compose exec -T postgres pg_isready -U postgres', {
        stdio: 'ignore',
      });
      log('green', '✓ PostgreSQL is healthy');
      break;
    } catch (error) {
      attempts++;
      if (attempts === maxAttempts) {
        log(
          'red',
          `✗ PostgreSQL failed to start after ${maxAttempts} attempts`,
        );
        process.exit(1);
      }
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log('');
  console.log('');

  // Generate Prisma
  if (!execute('pnpm run db:generate', '📝 Generating Prisma client')) {
    process.exit(1);
  }
  console.log('');

  // Run migrations
  if (
    !execute(
      'pnpm run db:migrate -- --skip-generate',
      '🗄️  Running Prisma migrations',
    )
  ) {
    process.exit(1);
  }
  console.log('');

  // Start application
  logSection('Starting NestJS Application');
  execute('pnpm run start:dev', '🚀 Starting application');
}

main().catch((error) => {
  log('red', `Setup failed: ${error.message}`);
  process.exit(1);
});
