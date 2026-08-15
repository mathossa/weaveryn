import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { CampaignCharacterRepository } from './campaign-character-repository'
import {
  CampaignCharacterRepositoryConflictError,
  type CampaignCharacterRecord,
  type CreateCampaignCharacterRecordInput,
  type UpdateCampaignCharacterRecordInput,
} from './campaign-character-repository'

type DatabaseClient = PrismaClient | Prisma.TransactionClient

export class PrismaCampaignCharacterRepository implements CampaignCharacterRepository {
  constructor(
    private readonly root: PrismaClient,
    private readonly db: DatabaseClient = root,
  ) {}

  runInTransaction<T>(
    operation: (repository: CampaignCharacterRepository) => Promise<T>,
  ): Promise<T> {
    return this.root.$transaction((tx) =>
      operation(new PrismaCampaignCharacterRepository(this.root, tx)),
    )
  }

  findWorldCharacterById(id: string) {
    return this.db.worldCharacter
      .findUnique({
        where: { id },
        select: {
          id: true,
          worldId: true,
          character: { select: { ownerUserId: true } },
        },
      })
      .then((value) =>
        value
          ? {
              id: value.id,
              worldId: value.worldId,
              ownerUserId: value.character.ownerUserId,
            }
          : null,
      )
  }

  findCampaignById(id: string) {
    return this.db.campaign.findUnique({
      where: { id },
      select: { id: true, worldId: true, ownerId: true },
    })
  }

  findCampaignMembership(campaignId: string, userId: string) {
    return this.db.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { role: true },
    })
  }

  async createCampaignCharacter(input: CreateCampaignCharacterRecordInput) {
    try {
      return await this.db.campaignCharacter.create({
        data: { ...input, sheetData: input.sheetData as Prisma.InputJsonValue },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new CampaignCharacterRepositoryConflictError()
      }
      throw error
    }
  }

  findCampaignCharacter(id: string): Promise<CampaignCharacterRecord | null> {
    return this.db.campaignCharacter.findUnique({ where: { id } })
  }

  findCampaignCharacterWithOwner(id: string) {
    return this.db.campaignCharacter
      .findUnique({
        where: { id },
        include: {
          worldCharacter: {
            include: { character: { select: { ownerUserId: true } } },
          },
        },
      })
      .then((value) => {
        if (!value) return null
        const { worldCharacter, ...record } = value
        return {
          ...record,
          ownerUserId: worldCharacter.character.ownerUserId,
        }
      })
  }

  listCampaignCharacters(
    campaignId: string,
  ): Promise<CampaignCharacterRecord[]> {
    return this.db.campaignCharacter.findMany({
      where: { campaignId },
      orderBy: { id: 'asc' },
    })
  }

  async updateCampaignCharacter(
    id: string,
    input: UpdateCampaignCharacterRecordInput,
  ) {
    const result = await this.db.campaignCharacter.updateMany({
      where: { id },
      data: {
        ...input,
        sheetData: input.sheetData as Prisma.InputJsonValue | undefined,
      },
    })
    return result.count
      ? this.db.campaignCharacter.findUnique({ where: { id } })
      : null
  }

  async deleteCampaignCharacter(id: string) {
    return (
      (await this.db.campaignCharacter.deleteMany({ where: { id } })).count ===
      1
    )
  }
}
