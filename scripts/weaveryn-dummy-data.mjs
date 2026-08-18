import 'dotenv/config'

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const MARKER = 'weaveryn-dev-dummy:v1'
const DEFAULT_DEV_DATABASE_NAME = 'weaveryn_dev'
const DEFAULT_PRIMARY_USER_ID = 'd1000000-0000-4000-8000-000000000002'

const dummyUsers = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    email: 'dummy-weaver@weaveryn.local',
    username: 'dummy-weaver',
    displayName: 'Rowan the Weaver',
  },
  {
    id: DEFAULT_PRIMARY_USER_ID,
    email: 'dummy-player@weaveryn.local',
    username: 'dummy-player',
    displayName: 'Aria Vale',
  },
  {
    id: 'd1000000-0000-4000-8000-000000000003',
    email: 'dummy-player-two@weaveryn.local',
    username: 'dummy-player-two',
    displayName: 'Bram Stone',
  },
  {
    id: 'd1000000-0000-4000-8000-000000000004',
    email: 'dummy-assistant-gm@weaveryn.local',
    username: 'dummy-assistant-gm',
    displayName: 'Cassia Rune',
  },
  {
    id: 'd1000000-0000-4000-8000-000000000005',
    email: 'dummy-spectator@weaveryn.local',
    username: 'dummy-spectator',
    displayName: 'Dorian Quill',
  },
]

function usage() {
  console.log(`Usage:
  npm run db:dummy
  npm run db:dummy -- --owner-email you@example.com
  npm run db:dummy -- --clean

Behavior:
  - Seeds a reusable development-only dataset into the configured dev database.
  - --owner-email attaches the primary sample data and nine Characters to an
    existing Weaveryn account so it is visible after logging in.
  - --clean removes only records owned by this dummy-data namespace.
  - The command refuses to run against production or a non-dev/test database.`)
}

function normalizeEmail(value) {
  const email = value?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw new Error('A valid --owner-email address is required.')
  }
  return email
}

function parseArgs(args) {
  let clean = false
  let ownerEmail = null

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--help' || argument === '-h') {
      usage()
      process.exit(0)
    }

    if (argument === '--clean') {
      clean = true
      continue
    }

    if (argument === '--owner-email') {
      ownerEmail = normalizeEmail(args[index + 1])
      index += 1
      continue
    }

    if (argument.startsWith('--owner-email=')) {
      ownerEmail = normalizeEmail(argument.slice('--owner-email='.length))
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  if (clean && ownerEmail) {
    throw new Error('--owner-email cannot be combined with --clean.')
  }

  return { clean, ownerEmail }
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function assertSafeDevDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dummy data is disabled when NODE_ENV=production.')
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Copy .env.example to .env first.')
  }

  const expectedDatabaseName =
    process.env.DEV_DATABASE_NAME ?? DEFAULT_DEV_DATABASE_NAME

  if (!/(^|[-_])(dev|test)([-_]|$)/i.test(expectedDatabaseName)) {
    throw new Error(
      'DEV_DATABASE_NAME must be clearly marked as a development or test database.',
    )
  }

  let actualDatabaseName
  try {
    const url = new URL(databaseUrl)
    actualDatabaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.')
  }

  if (!actualDatabaseName || actualDatabaseName !== expectedDatabaseName) {
    throw new Error(
      `Refusing dummy data operation: DATABASE_URL targets "${actualDatabaseName || 'unknown'}" but DEV_DATABASE_NAME is "${expectedDatabaseName}".`,
    )
  }

  return actualDatabaseName
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
    throw new Error(message || 'Prisma failed to execute the dummy-data command.')
  }
}

function ownershipChecksSql() {
  const userIdentityChecks = dummyUsers
    .map(
      (user) =>
        `("id" = ${sqlLiteral(user.id)}::uuid AND "email" = ${sqlLiteral(user.email)} AND "username" = ${sqlLiteral(user.username)})`,
    )
    .join('\n        OR ')

  const userIds = dummyUsers
    .map((user) => `${sqlLiteral(user.id)}::uuid`)
    .join(', ')
  const userEmails = dummyUsers.map((user) => sqlLiteral(user.email)).join(', ')
  const usernames = dummyUsers
    .map((user) => sqlLiteral(user.username))
    .join(', ')
  const marker = sqlLiteral(MARKER)

  return `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE (
      "id" IN (${userIds})
      OR "email" IN (${userEmails})
      OR "username" IN (${usernames})
    )
    AND NOT (
      ${userIdentityChecks}
    )
  ) THEN
    RAISE EXCEPTION 'DUMMY_DATA_USER_IDENTITY_CONFLICT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "World"
    WHERE "id" IN (
      'd2000000-0000-4000-8000-000000000001'::uuid,
      'd2000000-0000-4000-8000-000000000002'::uuid
    )
    AND COALESCE("description", '') NOT LIKE ${marker} || '%'
  ) THEN
    RAISE EXCEPTION 'DUMMY_DATA_WORLD_OWNERSHIP_CONFLICT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Campaign"
    WHERE "id" IN (
      'd3000000-0000-4000-8000-000000000001'::uuid,
      'd3000000-0000-4000-8000-000000000002'::uuid,
      'd3000000-0000-4000-8000-000000000003'::uuid
    )
    AND COALESCE("description", '') NOT LIKE ${marker} || '%'
  ) THEN
    RAISE EXCEPTION 'DUMMY_DATA_CAMPAIGN_OWNERSHIP_CONFLICT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Character"
    WHERE "id" BETWEEN
      'd4000000-0000-4000-8000-000000000001'::uuid AND
      'd4000000-0000-4000-8000-000000000011'::uuid
    AND COALESCE("coreData"->>'marker', '') <> ${marker}
  ) THEN
    RAISE EXCEPTION 'DUMMY_DATA_CHARACTER_OWNERSHIP_CONFLICT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "WorldEntity"
    WHERE "id" BETWEEN
      'd5000000-0000-4000-8000-000000000001'::uuid AND
      'd5000000-0000-4000-8000-000000000011'::uuid
    AND COALESCE("data"->>'marker', '') <> ${marker}
  ) THEN
    RAISE EXCEPTION 'DUMMY_DATA_ENTITY_OWNERSHIP_CONFLICT';
  END IF;
END $$;
`
}

const deleteDummyGraphSql = `
DELETE FROM "EntityRelationship"
WHERE "id" BETWEEN
  'd5100000-0000-4000-8000-000000000001'::uuid AND
  'd5100000-0000-4000-8000-000000000008'::uuid;

DELETE FROM "CampaignCharacter"
WHERE "id" BETWEEN
  'd4200000-0000-4000-8000-000000000001'::uuid AND
  'd4200000-0000-4000-8000-000000000006'::uuid;

DELETE FROM "WorldCharacter"
WHERE "id" BETWEEN
  'd4100000-0000-4000-8000-000000000001'::uuid AND
  'd4100000-0000-4000-8000-000000000012'::uuid;

DELETE FROM "CampaignMembership"
WHERE "id" BETWEEN
  'd3100000-0000-4000-8000-000000000001'::uuid AND
  'd3100000-0000-4000-8000-000000000010'::uuid;

DELETE FROM "Campaign"
WHERE "id" IN (
  'd3000000-0000-4000-8000-000000000001'::uuid,
  'd3000000-0000-4000-8000-000000000002'::uuid,
  'd3000000-0000-4000-8000-000000000003'::uuid
);

DELETE FROM "WorldTimeline"
WHERE "id" IN (
  'd2200000-0000-4000-8000-000000000001'::uuid,
  'd2200000-0000-4000-8000-000000000002'::uuid
);

DELETE FROM "WorldEntity"
WHERE "id" BETWEEN
  'd5000000-0000-4000-8000-000000000001'::uuid AND
  'd5000000-0000-4000-8000-000000000011'::uuid;

DELETE FROM "WorldMembership"
WHERE "id" BETWEEN
  'd2100000-0000-4000-8000-000000000001'::uuid AND
  'd2100000-0000-4000-8000-000000000008'::uuid;

DELETE FROM "Character"
WHERE "id" BETWEEN
  'd4000000-0000-4000-8000-000000000001'::uuid AND
  'd4000000-0000-4000-8000-000000000011'::uuid;

DELETE FROM "World"
WHERE "id" IN (
  'd2000000-0000-4000-8000-000000000001'::uuid,
  'd2000000-0000-4000-8000-000000000002'::uuid
);
`

function cleanSql() {
  const userIds = dummyUsers
    .map((user) => `${sqlLiteral(user.id)}::uuid`)
    .join(', ')

  return `
BEGIN;
${ownershipChecksSql()}
${deleteDummyGraphSql}
DELETE FROM "User" WHERE "id" IN (${userIds});
COMMIT;
`
}

function insertDummyUsersSql(ownerEmail) {
  const usersToInsert = ownerEmail
    ? dummyUsers.filter((user) => user.id !== DEFAULT_PRIMARY_USER_ID)
    : dummyUsers

  const values = usersToInsert
    .map(
      (user) =>
        `(${sqlLiteral(user.id)}::uuid, ${sqlLiteral(user.email)}, false, ${sqlLiteral(user.username)}, ${sqlLiteral(user.displayName)}, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .join(',\n  ')

  return `
INSERT INTO "User" (
  "id", "email", "emailVerified", "username", "displayName",
  "isInstanceAdmin", "createdAt", "updatedAt"
)
VALUES
  ${values}
ON CONFLICT ("id") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "updatedAt" = CURRENT_TIMESTAMP;
`
}

function primaryOwnerContextSql(ownerEmail) {
  if (!ownerEmail) {
    return `
CREATE TEMP TABLE "_WeaverynDummyContext" ("primaryUserId" uuid NOT NULL) ON COMMIT DROP;
INSERT INTO "_WeaverynDummyContext" VALUES (${sqlLiteral(DEFAULT_PRIMARY_USER_ID)}::uuid);
`
  }

  const email = sqlLiteral(ownerEmail)
  return `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE lower("email") = lower(${email})) THEN
    RAISE EXCEPTION 'DUMMY_DATA_OWNER_EMAIL_NOT_FOUND';
  END IF;
END $$;

CREATE TEMP TABLE "_WeaverynDummyContext" ("primaryUserId" uuid NOT NULL) ON COMMIT DROP;
INSERT INTO "_WeaverynDummyContext"
SELECT "id" FROM "User" WHERE lower("email") = lower(${email});
`
}

function seedSql(ownerEmail) {
  const marker = sqlLiteral(MARKER)
  const worldOneDescription = sqlLiteral(
    `${MARKER} A broad fantasy world used to exercise normal World and Campaign views.`,
  )
  const worldTwoDescription = sqlLiteral(
    `${MARKER} A second world used to exercise portable Characters and cross-World selection.`,
  )

  return `
BEGIN;
${ownershipChecksSql()}
${deleteDummyGraphSql}
${insertDummyUsersSql(ownerEmail)}
${primaryOwnerContextSql(ownerEmail)}

INSERT INTO "World" ("id", "name", "description", "ownerId", "createdAt", "updatedAt")
VALUES
  ('d2000000-0000-4000-8000-000000000001', 'Thalorin', ${worldOneDescription}, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2000000-0000-4000-8000-000000000002', 'Aetherdeep', ${worldTwoDescription}, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "WorldMembership" ("id", "worldId", "userId", "role", "joinedAt", "updatedAt")
VALUES
  ('d2100000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2100000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'MEMBER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2100000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2100000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'VIEWER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2100000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2100000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000005', 'VIEWER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "WorldMembership" ("id", "worldId", "userId", "role", "joinedAt", "updatedAt")
SELECT 'd2100000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', "primaryUserId", 'MEMBER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_WeaverynDummyContext";

INSERT INTO "WorldMembership" ("id", "worldId", "userId", "role", "joinedAt", "updatedAt")
SELECT 'd2100000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000002', "primaryUserId", 'MEMBER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_WeaverynDummyContext";

INSERT INTO "WorldTimeline" ("id", "worldId", "name", "createdAt", "updatedAt")
VALUES
  ('d2200000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Thalorin Reckoning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d2200000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Deep Calendar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Campaign" (
  "id", "name", "description", "worldId", "ownerId", "timelineId",
  "currentWorldPosition", "currentWorldDateLabel", "status", "createdAt", "updatedAt"
)
VALUES
  ('d3000000-0000-4000-8000-000000000001', 'The Verdant Vale', ${sqlLiteral(`${MARKER} Primary active campaign with a full mixed-role party.`)}, 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd2200000-0000-4000-8000-000000000001', 127.5, '17 Harvestwane, 742 AR', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('d3000000-0000-4000-8000-000000000002', 'The Shattered Crown', ${sqlLiteral(`${MARKER} Secondary active campaign run by an assistant GM.`)}, 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'd2200000-0000-4000-8000-000000000001', 88, '3 Frostfall, 741 AR', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '8 days'),
  ('d3000000-0000-4000-8000-000000000003', 'Echoes of Aetherdeep', ${sqlLiteral(`${MARKER} Completed campaign used to exercise ended-campaign presentation.`)}, 'd2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'd2200000-0000-4000-8000-000000000002', 412, 'The Last Bell', 'ENDED', CURRENT_TIMESTAMP - INTERVAL '240 days', CURRENT_TIMESTAMP - INTERVAL '45 days');

INSERT INTO "CampaignMembership" ("id", "campaignId", "userId", "role", "joinedAt", "updatedAt")
VALUES
  ('d3100000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'GM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'ASSISTANT_GM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000004', 'd3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'PLAYER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000005', 'd3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'SPECTATOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000006', 'd3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000004', 'GM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000008', 'd3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001', 'GM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d3100000-0000-4000-8000-000000000010', 'd3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000005', 'SPECTATOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CampaignMembership" ("id", "campaignId", "userId", "role", "joinedAt", "updatedAt")
SELECT membership_id, campaign_id, "primaryUserId", 'PLAYER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_WeaverynDummyContext"
CROSS JOIN (
  VALUES
    ('d3100000-0000-4000-8000-000000000003'::uuid, 'd3000000-0000-4000-8000-000000000001'::uuid),
    ('d3100000-0000-4000-8000-000000000007'::uuid, 'd3000000-0000-4000-8000-000000000002'::uuid),
    ('d3100000-0000-4000-8000-000000000009'::uuid, 'd3000000-0000-4000-8000-000000000003'::uuid)
) AS memberships(membership_id, campaign_id);

INSERT INTO "Character" ("id", "ownerUserId", "name", "image", "coreData", "status", "createdAt", "updatedAt")
SELECT character_id, "primaryUserId", character_name, '/images/characters/default.webp', character_data::jsonb, 'ACTIVE', created_at, updated_at
FROM "_WeaverynDummyContext"
CROSS JOIN (
  VALUES
    ('d4000000-0000-4000-8000-000000000001'::uuid, 'Bodwick', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'wandering cartographer', level: 7, tags: ['explorer', 'scholar'] }))}, CURRENT_TIMESTAMP - INTERVAL '150 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('d4000000-0000-4000-8000-000000000002'::uuid, 'Seraphine Dawn', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'sun-sworn guardian', level: 6, tags: ['guardian', 'noble'] }))}, CURRENT_TIMESTAMP - INTERVAL '120 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('d4000000-0000-4000-8000-000000000003'::uuid, 'Tamsin Vale', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'hedge witch', level: 5, tags: ['mystic', 'herbalist'] }))}, CURRENT_TIMESTAMP - INTERVAL '110 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('d4000000-0000-4000-8000-000000000004'::uuid, 'Corvin Ash', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'disgraced duelist', level: 5, tags: ['duelist', 'wanderer'] }))}, CURRENT_TIMESTAMP - INTERVAL '100 days', CURRENT_TIMESTAMP - INTERVAL '12 days'),
    ('d4000000-0000-4000-8000-000000000005'::uuid, 'Mira Fen', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'marsh guide', level: 4, tags: ['ranger', 'guide'] }))}, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '18 days'),
    ('d4000000-0000-4000-8000-000000000006'::uuid, 'Torren Blackbriar', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'retired mercenary', level: 8, tags: ['veteran', 'protector'] }))}, CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('d4000000-0000-4000-8000-000000000007'::uuid, 'Nyx Vesper', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'night courier', level: 3, tags: ['scout', 'rogue'] }))}, CURRENT_TIMESTAMP - INTERVAL '70 days', CURRENT_TIMESTAMP - INTERVAL '32 days'),
    ('d4000000-0000-4000-8000-000000000008'::uuid, 'Pip Underbough', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'traveling storyteller', level: 3, tags: ['bard', 'storyteller'] }))}, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '40 days'),
    ('d4000000-0000-4000-8000-000000000009'::uuid, 'Kael Stormward', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'storm-touched pilgrim', level: 6, tags: ['pilgrim', 'mystic'] }))}, CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP - INTERVAL '50 days')
) AS characters(character_id, character_name, character_data, created_at, updated_at);

INSERT INTO "Character" ("id", "ownerUserId", "name", "image", "coreData", "status", "createdAt", "updatedAt")
VALUES
  ('d4000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000003', 'Brakka Ironroot', '/images/characters/default.webp', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'stone mason turned adventurer', level: 6, tags: ['artisan', 'warrior'] }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '100 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('d4000000-0000-4000-8000-000000000011', 'd1000000-0000-4000-8000-000000000004', 'Ilyra Moss', '/images/characters/default.webp', ${sqlLiteral(JSON.stringify({ marker: MARKER, concept: 'keeper of old roads', level: 7, tags: ['warden', 'historian'] }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '130 days', CURRENT_TIMESTAMP - INTERVAL '4 days');

INSERT INTO "WorldCharacter" ("id", "characterId", "worldId", "nameOverride", "worldData", "status", "createdAt", "updatedAt")
VALUES
  ('d4100000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Dawnwatch', reputation: 'trusted' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Highcourt' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Verdant Vale' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Ashbridge' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000005', 'd4000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Fenmere' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000006', 'd4000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Blackbriar Keep' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000007', 'd4000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Nightmarket' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000008', 'd4000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Willowbank' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000009', 'd4000000-0000-4000-8000-000000000009', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Stormwatch' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000010', 'd4000000-0000-4000-8000-000000000010', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Dawnwatch' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000011', 'd4000000-0000-4000-8000-000000000011', 'd2000000-0000-4000-8000-000000000001', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Old Road' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4100000-0000-4000-8000-000000000012', 'd4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'Bodwick of Aetherdeep', ${sqlLiteral(JSON.stringify({ marker: MARKER, home: 'Brasshaven', note: 'Same portable Character in a second World' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CampaignCharacter" ("id", "worldCharacterId", "campaignId", "sheetData", "status", "createdAt", "updatedAt")
VALUES
  ('d4200000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 41, max: 48 }, notes: 'Searching for the lost north-road atlas.' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4200000-0000-4000-8000-000000000002', 'd4100000-0000-4000-8000-000000000010', 'd3000000-0000-4000-8000-000000000001', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 52, max: 52 }, notes: 'Owes the Thornbound Circle a favor.' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4200000-0000-4000-8000-000000000003', 'd4100000-0000-4000-8000-000000000011', 'd3000000-0000-4000-8000-000000000001', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 35, max: 39 }, notes: 'Knows the old road markers.' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4200000-0000-4000-8000-000000000004', 'd4100000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-000000000002', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 27, max: 31 }, notes: 'Carries a shard of the crown.' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4200000-0000-4000-8000-000000000005', 'd4100000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 44, max: 44 }, notes: 'Sworn to protect the claimant.' }))}::jsonb, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d4200000-0000-4000-8000-000000000006', 'd4100000-0000-4000-8000-000000000012', 'd3000000-0000-4000-8000-000000000003', ${sqlLiteral(JSON.stringify({ marker: MARKER, hp: { current: 38, max: 48 }, notes: 'Retired after the Last Bell.' }))}::jsonb, 'RETIRED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "WorldEntity" ("id", "worldId", "type", "name", "description", "image", "data", "createdById", "createdAt", "updatedAt")
VALUES
  ('d5000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'LOCATION', 'Dawnwatch', 'A walled trade city built around an ancient observatory.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, population: 42000, tags: ['city', 'trade', 'observatory'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'LOCATION', 'The Verdant Vale', 'A fertile valley whose old roads have begun moving overnight.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, tags: ['wilderness', 'mystery'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', 'LOCATION', 'The Glass Road', 'A translucent road visible only under moonlight.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, tags: ['road', 'ruin', 'magic'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000001', 'NPC', 'Queen Maelis', 'The cautious ruler of Highcourt and patron of several expeditions.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, disposition: 'neutral', tags: ['royalty', 'patron'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000001', 'NPC', 'Archivist Nymm', 'An obsessive historian who collects contradictory maps.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, disposition: 'friendly', tags: ['scholar', 'maps'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000001', 'FACTION', 'Thornbound Circle', 'Wardens who believe the Vale should remain uncharted.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, influence: 'regional', tags: ['wardens', 'secretive'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000001', 'ITEM', 'Sunken Crown', 'A broken ceremonial crown recovered from a flooded crypt.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, rarity: 'unique', tags: ['relic', 'crown'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000001', 'LORE', 'The Last North Road', 'A disputed route said to connect Thalorin to a vanished kingdom.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, tags: ['legend', 'road'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000009', 'd2000000-0000-4000-8000-000000000002', 'LOCATION', 'Brasshaven', 'A vertical harbor city suspended over the blue abyss.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, population: 18000, tags: ['city', 'harbor', 'vertical'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000010', 'd2000000-0000-4000-8000-000000000002', 'NPC', 'Captain Orren', 'Former expedition captain who survived the Last Bell.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, disposition: 'wary', tags: ['captain', 'survivor'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5000000-0000-4000-8000-000000000011', 'd2000000-0000-4000-8000-000000000002', 'FACTION', 'Azure Guild', 'Navigators who chart the currents beneath Aetherdeep.', NULL, ${sqlLiteral(JSON.stringify({ marker: MARKER, influence: 'major', tags: ['navigators', 'guild'] }))}::jsonb, 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "EntityRelationship" ("id", "worldId", "sourceEntityId", "targetEntityId", "relationshipType", "label", "metadata", "createdAt", "updatedAt")
VALUES
  ('d5100000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000004', 'd5000000-0000-4000-8000-000000000001', 'RULES', 'Rules from Highcourt', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000005', 'd5000000-0000-4000-8000-000000000008', 'RESEARCHES', 'Collects maps of', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000006', 'd5000000-0000-4000-8000-000000000002', 'PROTECTS', 'Protects', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000003', 'd5000000-0000-4000-8000-000000000002', 'LEADS_TO', 'Leads into', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000007', 'd5000000-0000-4000-8000-000000000004', 'CLAIMED_BY', 'Claimed by', ${sqlLiteral(JSON.stringify({ marker: MARKER, disputed: true }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000008', 'd5000000-0000-4000-8000-000000000003', 'DESCRIBES', 'May describe', ${sqlLiteral(JSON.stringify({ marker: MARKER, certainty: 'low' }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000002', 'd5000000-0000-4000-8000-000000000010', 'd5000000-0000-4000-8000-000000000009', 'LIVES_IN', 'Lives in', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('d5100000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000002', 'd5000000-0000-4000-8000-000000000011', 'd5000000-0000-4000-8000-000000000009', 'BASED_IN', 'Based in', ${sqlLiteral(JSON.stringify({ marker: MARKER }))}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
`
}

function main() {
  const { clean, ownerEmail } = parseArgs(process.argv.slice(2))
  const databaseName = assertSafeDevDatabase()

  if (clean) {
    runSql(cleanSql())
    console.log(`Removed Weaveryn dummy data from "${databaseName}".`)
    return
  }

  runSql(seedSql(ownerEmail))

  console.log(`Seeded Weaveryn dummy data into "${databaseName}".`)
  console.log('Created: 2 Worlds, 3 Campaigns, 11 Characters, 12 WorldCharacters, 6 CampaignCharacters, 11 World entities, and linked memberships/relationships.')

  if (ownerEmail) {
    console.log(`Primary sample data belongs to existing account: ${ownerEmail}`)
  } else {
    console.log('Primary sample data belongs to dummy-player@weaveryn.local. That dummy identity has no Better Auth password; use --owner-email to attach it to a login-capable account.')
  }
}

try {
  main()
} catch (error) {
  console.error(`Dummy data failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
