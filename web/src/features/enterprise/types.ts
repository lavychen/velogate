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
export type Department = {
  id: string
  name: string
  manager: string
  budget: number
}
export type Member = {
  id: string
  name: string
  email: string
  departmentId: string
  role: string
  budget: number
  enabled: boolean
}
export type EnterpriseKey = {
  id: string
  name: string
  memberId: string
  budget: number
  models: string[]
  expiresAt: string
  enabled: boolean
}
export type UsageRecord = {
  day: number
  departmentId: string
  memberId: string
  keyId: string
  model: string
  calls: number
  tokens: number
  cost: number
}
export type UsageDimension = 'departments' | 'members' | 'keys' | 'models'
export type UsageMetric = 'cost' | 'calls' | 'tokens'
export type UsageRange = 'today' | '7d' | '30d'
export type UsageRow = {
  id: string
  name: string
  calls: number
  tokens: number
  cost: number
}
export type EnterpriseSection = 'analytics' | 'members' | 'departments' | 'keys'
