/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { create } from 'zustand'

import { DEMO_DEPARTMENTS, DEMO_KEYS, DEMO_MEMBERS } from './demo-data'
import type { Department, EnterpriseKey, Member } from './types'

type EnterpriseDemoState = {
  departments: Department[]
  members: Member[]
  keys: EnterpriseKey[]
  saveDepartment: (value: Department) => void
  saveMember: (value: Member) => void
  saveKey: (value: EnterpriseKey) => void
  removeDepartment: (id: string) => boolean
  removeMember: (id: string) => boolean
  removeKey: (id: string) => void
  reset: () => void
}

export const useEnterpriseDemoStore = create<EnterpriseDemoState>(
  (set, get) => ({
    departments: DEMO_DEPARTMENTS,
    members: DEMO_MEMBERS,
    keys: DEMO_KEYS,
    saveDepartment: (value) =>
      set((state) => ({
        departments: [
          ...state.departments.filter((item) => item.id !== value.id),
          value,
        ],
      })),
    saveMember: (value) =>
      set((state) => ({
        members: [
          ...state.members.filter((item) => item.id !== value.id),
          value,
        ],
        keys: value.enabled
          ? state.keys
          : state.keys.map((key) =>
              key.memberId === value.id ? { ...key, enabled: false } : key
            ),
      })),
    saveKey: (value) =>
      set((state) => ({
        keys: [...state.keys.filter((item) => item.id !== value.id), value],
      })),
    removeDepartment: (id) => {
      if (get().members.some((member) => member.departmentId === id)) {
        return false
      }
      set((state) => ({
        departments: state.departments.filter((item) => item.id !== id),
      }))
      return true
    },
    removeMember: (id) => {
      if (get().keys.some((key) => key.memberId === id)) return false
      set((state) => ({
        members: state.members.filter((item) => item.id !== id),
      }))
      return true
    },
    removeKey: (id) =>
      set((state) => ({ keys: state.keys.filter((item) => item.id !== id) })),
    reset: () =>
      set({
        departments: DEMO_DEPARTMENTS,
        members: DEMO_MEMBERS,
        keys: DEMO_KEYS,
      }),
  })
)
