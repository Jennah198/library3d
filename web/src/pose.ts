import { create } from 'zustand'

/** Camera position published ~10x/second so the minimap can show where you are. */
interface PoseState {
  x: number
  z: number
  /** Heading in radians, measured from +z toward +x. */
  yaw: number
  set: (x: number, z: number, yaw: number) => void
}

export const usePose = create<PoseState>()((set) => ({
  x: -19,
  z: 0,
  yaw: Math.PI / 2,
  set: (x, z, yaw) => set({ x, z, yaw }),
}))
