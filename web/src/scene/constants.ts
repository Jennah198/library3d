export const CASE_W = 4.4
export const CASE_D = 0.8
export const LEVEL_H = 1.1

/** The public hall. The entrance door is cut into the west wall (x = minX). */
export const HALL = { minX: -13, maxX: 13, minZ: -7.2, maxZ: 7.2, height: 6.5 }
export const WALL_X = HALL.minX
export const DOOR_W = 2.4
export const DOOR_H = 3.2

/** The personal study. */
export const STUDY = { minX: -7.2, maxX: 7.2, minZ: -5.2, maxZ: 5.2, height: 6 }

export const ROOM_BOUNDS = { public: HALL, personal: STUDY } as const

type V3 = [number, number, number]
export const POSES: Record<'door' | 'hall' | 'personal', { pos: V3; target: V3 }> = {
  door: { pos: [-24, 1.7, 0.5], target: [-13, 3.4, 0] },
  hall: { pos: [-11.2, 1.7, 0], target: [-1, 1.6, 0] },
  personal: { pos: [0, 1.75, 3.6], target: [0, 2.0, -4.6] },
}

export const MAX_COLLECTIONS = 6

/**
 * Bookcase positions in the study for n collections (max six): the first three stand
 * along the back wall, the rest along the front wall, each row centred.
 */
export function studySlots(n: number) {
  const row = (count: number, z: number, rotation: number) =>
    Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * 4.7, z, rotation }))
  return [...row(Math.min(n, 3), -4.7, 0), ...row(Math.max(0, Math.min(n, MAX_COLLECTIONS) - 3), 4.7, Math.PI)]
}
