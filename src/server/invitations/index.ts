import { prisma } from '@/lib/prisma'
import { MembershipInvitationService } from './membership-invitation-service'
import { PrismaMembershipInvitationUnitOfWork } from './prisma-membership-invitation-repository'

export * from './membership-invitation-errors'
export * from './membership-invitation-repository'
export * from './membership-invitation-service'
export * from './prisma-membership-invitation-repository'

export const membershipInvitationService = new MembershipInvitationService(
  new PrismaMembershipInvitationUnitOfWork(prisma),
)
