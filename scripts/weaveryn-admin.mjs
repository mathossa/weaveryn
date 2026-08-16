import { randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { hashPassword } from 'better-auth/crypto'

function usage() {
  console.log(`Usage:
  npm run weaveryn -- admin promote <email>
  npm run weaveryn -- admin demote <email>
  npm run weaveryn -- admin reset-password <email>

Password reset behavior:
  - Set WEAVERYN_ADMIN_RESET_PASSWORD to provide the new password without putting it in shell arguments.
  - If the variable is not set, a strong temporary password is generated and printed once.
  - Existing sessions for the target user are revoked.`)
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function normalizeEmail(value) {
  const email = value?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw new Error('A valid user email address is required.')
  }
  return email
}

function runSql(sql) {
  const executable = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
  )

  const result = spawnSync(executable, ['db', 'execute', '--stdin'], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim()
    throw new Error(message || 'Prisma failed to execute the admin command.')
  }
}

function promote(email) {
  const emailSql = sqlLiteral(email)
  runSql(`
DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM "User"
  WHERE lower(email) = lower(${emailSql});

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  UPDATE "User"
  SET "isInstanceAdmin" = true,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = target_id;
END $$;
`)
  console.log(`Promoted ${email} to instance administrator.`)
}

function demote(email) {
  const emailSql = sqlLiteral(email)
  runSql(`
DO $$
DECLARE
  target_id uuid;
  target_is_admin boolean;
  admin_count integer;
BEGIN
  SELECT id, "isInstanceAdmin"
  INTO target_id, target_is_admin
  FROM "User"
  WHERE lower(email) = lower(${emailSql});

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF target_is_admin THEN
    SELECT count(*) INTO admin_count
    FROM "User"
    WHERE "isInstanceAdmin" = true;

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_INSTANCE_ADMIN';
    END IF;

    UPDATE "User"
    SET "isInstanceAdmin" = false,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = target_id;
  END IF;
END $$;
`)
  console.log(`Removed instance administrator access from ${email}.`)
}

async function resetPassword(email) {
  const configuredPassword = process.env.WEAVERYN_ADMIN_RESET_PASSWORD
  const generatedPassword = configuredPassword ? null : randomBytes(24).toString('base64url')
  const newPassword = configuredPassword ?? generatedPassword

  if (newPassword.length < 8) {
    throw new Error('The reset password must contain at least 8 characters.')
  }

  const passwordHash = await hashPassword(newPassword)
  const emailSql = sqlLiteral(email)
  const hashSql = sqlLiteral(passwordHash)
  const accountIdSql = sqlLiteral(randomUUID())

  runSql(`
DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM "User"
  WHERE lower(email) = lower(${emailSql});

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  UPDATE "AuthAccount"
  SET password = ${hashSql},
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "userId" = target_id
    AND "providerId" = 'credential';

  IF NOT FOUND THEN
    INSERT INTO "AuthAccount" (
      id,
      "accountId",
      "providerId",
      "userId",
      password,
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${accountIdSql}::uuid,
      target_id::text,
      'credential',
      target_id,
      ${hashSql},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;

  DELETE FROM "AuthSession"
  WHERE "userId" = target_id;
END $$;
`)

  console.log(`Reset the password for ${email} and revoked existing sessions.`)
  if (generatedPassword) {
    console.log(`Temporary password: ${generatedPassword}`)
    console.log('Provide it securely and have the user change it after signing in.')
  }
}

async function main() {
  const [scope, command, identifier, ...extra] = process.argv.slice(2)

  if (scope !== 'admin' || !command || !identifier || extra.length > 0) {
    usage()
    process.exitCode = 1
    return
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running admin CLI commands.')
  }

  const email = normalizeEmail(identifier)

  switch (command) {
    case 'promote':
      promote(email)
      break
    case 'demote':
      demote(email)
      break
    case 'reset-password':
      await resetPassword(email)
      break
    default:
      usage()
      process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`Admin command failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
