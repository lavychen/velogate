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
import type { Department, EnterpriseKey, Member, UsageRecord } from './types'

export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'rd', name: 'Engineering', manager: '陈克顺', budget: 150 },
  { id: 'algo', name: 'Data science', manager: '林思远', budget: 120 },
  { id: 'design', name: 'Product design', manager: '周婉清', budget: 60 },
  { id: 'growth', name: 'Growth marketing', manager: '赵明轩', budget: 50 },
]

export const DEMO_MEMBERS: Member[] = [
  {
    id: 'chen',
    name: '陈克顺',
    email: 'chen.ks@example.com',
    departmentId: 'rd',
    role: 'Architect',
    budget: 60,
    enabled: true,
  },
  {
    id: 'lin',
    name: '林思远',
    email: 'lin.sy@example.com',
    departmentId: 'algo',
    role: 'Team lead',
    budget: 50,
    enabled: true,
  },
  {
    id: 'zhang',
    name: '张若尘',
    email: 'zhang.rc@example.com',
    departmentId: 'rd',
    role: 'Developer',
    budget: 40,
    enabled: true,
  },
  {
    id: 'zhou',
    name: '周婉清',
    email: 'zhou.wq@example.com',
    departmentId: 'design',
    role: 'Designer',
    budget: 35,
    enabled: true,
  },
  {
    id: 'li',
    name: '李浩然',
    email: 'li.hr@example.com',
    departmentId: 'algo',
    role: 'Developer',
    budget: 30,
    enabled: true,
  },
  {
    id: 'zhao',
    name: '赵明轩',
    email: 'zhao.mx@example.com',
    departmentId: 'growth',
    role: 'Team lead',
    budget: 30,
    enabled: true,
  },
]

export const DEMO_MODELS = [
  'gpt-4.1',
  'claude-sonnet-4-5',
  'gemini-2.5-pro',
  'deepseek-r1',
]

export const DEMO_KEYS: EnterpriseKey[] = [
  {
    id: 'demo-key-1',
    name: 'Cursor',
    memberId: 'chen',
    budget: 50,
    models: ['gpt-4.1', 'claude-sonnet-4-5'],
    expiresAt: '',
    enabled: true,
  },
  {
    id: 'demo-key-2',
    name: 'RAG pipeline',
    memberId: 'lin',
    budget: 40,
    models: ['deepseek-r1', 'gemini-2.5-pro'],
    expiresAt: '',
    enabled: true,
  },
  {
    id: 'demo-key-3',
    name: 'Code review',
    memberId: 'zhang',
    budget: 30,
    models: ['claude-sonnet-4-5'],
    expiresAt: '',
    enabled: true,
  },
  {
    id: 'demo-key-4',
    name: 'Product assistant',
    memberId: 'zhou',
    budget: 25,
    models: ['gpt-4.1', 'gemini-2.5-pro'],
    expiresAt: '',
    enabled: true,
  },
  {
    id: 'demo-key-5',
    name: 'Model evaluation',
    memberId: 'li',
    budget: 20,
    models: ['deepseek-r1'],
    expiresAt: '',
    enabled: false,
  },
  {
    id: 'demo-key-6',
    name: 'Marketing',
    memberId: 'zhao',
    budget: 20,
    models: ['claude-sonnet-4-5'],
    expiresAt: '',
    enabled: true,
  },
]

// Fixed example activity, shared by every chart and table. These values never
// enter the gateway's accounting, credential, or user management APIs.
export const DEMO_USAGE: UsageRecord[] = Array.from({ length: 30 }, (_, day) =>
  DEMO_KEYS.filter((key) => key.enabled).map((key, index) => ({
    day,
    departmentId:
      DEMO_MEMBERS.find((member) => member.id === key.memberId)?.departmentId ??
      '',
    memberId: key.memberId,
    keyId: key.id,
    model: key.models[day % key.models.length],
    calls: [620, 480, 420, 350, 260][index] + (day % 5) * 21,
    tokens: [940000, 760000, 640000, 530000, 390000][index] + (day % 5) * 3200,
    cost: [2.2, 1.8, 1.65, 1.5, 1.05][index] + (day % 5) * 0.12,
  }))
).flat()
