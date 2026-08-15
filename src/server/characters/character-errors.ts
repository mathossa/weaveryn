export type CharacterDomainErrorCode =
  | 'CHARACTER_NOT_FOUND'
  | 'CHARACTER_PERMISSION_DENIED'
  | 'WORLD_CHARACTER_NOT_FOUND'
  | 'WORLD_CHARACTER_ALREADY_EXISTS'

export class CharacterDomainError extends Error {
  constructor(
    public readonly code: CharacterDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CharacterDomainError'
  }
}

export const characterNotFound = (characterId: string) =>
  new CharacterDomainError(
    'CHARACTER_NOT_FOUND',
    `Character ${characterId} was not found or is not owned by this user.`,
  )
export const characterPermissionDenied = (
  characterId: string,
  userId: string,
) =>
  new CharacterDomainError(
    'CHARACTER_PERMISSION_DENIED',
    `User ${userId} cannot change Character ${characterId}.`,
  )
export const worldCharacterNotFound = (worldCharacterId: string) =>
  new CharacterDomainError(
    'WORLD_CHARACTER_NOT_FOUND',
    `WorldCharacter ${worldCharacterId} was not found or is not owned by this user.`,
  )
export const worldCharacterAlreadyExists = (
  characterId: string,
  worldId: string,
) =>
  new CharacterDomainError(
    'WORLD_CHARACTER_ALREADY_EXISTS',
    `Character ${characterId} already has an incarnation in World ${worldId}.`,
  )
