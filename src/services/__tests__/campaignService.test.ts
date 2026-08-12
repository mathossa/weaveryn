import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createCampaign } from '../campaignService'
import { CampaignRole } from '../../generated/prisma/client'

// Safety check at module initialization
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const dbUrl = new URL(process.env.DATABASE_URL)
const databaseName = dbUrl.pathname.substring(1) // Remove leading slash

if (databaseName !== 'weaveryn_test') {
  throw new Error('Database name must be exactly "weaveryn_test"')
}

beforeEach(async () => {
  // Clean database in foreign-key-safe order
  await prisma.campaignMembership.deleteMany({})
  await prisma.campaign.deleteMany({})
  await prisma.user.deleteMany({})
})

describe('createCampaign', () => {
  it('creates a campaign successfully', async () => {
    // Create a real user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser'
      }
    })

    // Call createCampaign
    const campaign = await createCampaign(user.id, 'Test Campaign', 'A test description')

    // Verify the returned Campaign exists
    expect(campaign).toBeDefined()
    expect(campaign.id).toBeDefined()

    // Verify its name, description, and ownerId
    expect(campaign.name).toBe('Test Campaign')
    expect(campaign.description).toBe('A test description')
    expect(campaign.ownerId).toBe(user.id)
  })

  it('trims whitespace from campaign name', async () => {
    // Create a real user
    const user = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        username: 'testuser2'
      }
    })

    // Call createCampaign with leading/trailing whitespace
    const campaign = await createCampaign(user.id, '  Whitespace Test  ')

    // Verify the stored/returned name is trimmed
    expect(campaign.name).toBe('Whitespace Test')
  })

  it('rejects whitespace-only campaign names', async () => {
    // Create a real user
    const user = await prisma.user.create({
      data: {
        email: 'test3@example.com',
        username: 'testuser3'
      }
    })

    // Call createCampaign with a whitespace-only name
    await expect(createCampaign(user.id, '   ')).rejects.toThrow(
      'Campaign name is required'
    )
  })

  it('creates OWNER membership', async () => {
    // Create a real user
    const user = await prisma.user.create({
      data: {
        email: 'test4@example.com',
        username: 'testuser4'
      }
    })

    // Create a campaign
    const campaign = await createCampaign(user.id, 'Membership Test')

    // Query CampaignMembership
    const membership = await prisma.campaignMembership.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId: user.id
        }
      }
    })

    // Verify the membership belongs to the campaign and owner
    expect(membership).toBeDefined()
    expect(membership?.campaignId).toBe(campaign.id)
    expect(membership?.userId).toBe(user.id)

    // Verify role equals CampaignRole.OWNER
    expect(membership?.role).toBe(CampaignRole.OWNER)
  })

  it('demonstrates real PostgreSQL transaction rollback', async () => {
    // Create a real user first
    const user = await prisma.user.create({
      data: {
        email: 'test5@example.com',
        username: 'testuser5'
      }
    })

    // Install test trigger function before calling createCampaign
    await prisma.$executeRaw`
      CREATE FUNCTION test_reject_campaign_membership()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced membership failure for rollback test';
      END;
      $$ LANGUAGE plpgsql;
    `

    await prisma.$executeRaw`
      CREATE TRIGGER test_reject_campaign_membership_trigger
      BEFORE INSERT ON "CampaignMembership"
      FOR EACH ROW
      EXECUTE FUNCTION test_reject_campaign_membership();
    `

    try {
      // Call the real createCampaign() for the test user
      await expect(createCampaign(user.id, 'Rollback Test')).rejects.toThrow(
        'forced membership failure for rollback test'
      )

      // Verify zero Campaign rows exist for that owner (demonstrating rollback)
      const campaigns = await prisma.campaign.findMany({
        where: {
          ownerId: user.id
        }
      })
      
      expect(campaigns.length).toBe(0)
    } finally {
      // Cleanup triggers in finally block
      await prisma.$executeRaw`
        DROP TRIGGER IF EXISTS test_reject_campaign_membership_trigger
        ON "CampaignMembership"
      `
      
      await prisma.$executeRaw`
        DROP FUNCTION IF EXISTS test_reject_campaign_membership()
      `
    }
  })
})
