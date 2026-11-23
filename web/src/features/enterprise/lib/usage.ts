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
import type {
  UsageDimension,
  UsageRange,
  UsageRecord,
  UsageRow,
} from '../types'

export function filterUsage(
  records: UsageRecord[],
  range: UsageRange,
  departmentId: string
): UsageRecord[] {
  const days = { today: 1, '7d': 7, '30d': 30 }[range]
  return records.filter(
    (record) =>
      record.day < days &&
      (!departmentId || record.departmentId === departmentId)
  )
}

export function summarizeUsage(
  records: UsageRecord[]
): Pick<UsageRow, 'calls' | 'tokens' | 'cost'> {
  return records.reduce(
    (total, record) => ({
      calls: total.calls + record.calls,
      tokens: total.tokens + record.tokens,
      cost: total.cost + record.cost,
    }),
    { calls: 0, tokens: 0, cost: 0 }
  )
}

export function groupUsage(
  records: UsageRecord[],
  dimension: UsageDimension,
  names: Map<string, string>
): UsageRow[] {
  const rows = new Map<string, UsageRow>()
  for (const record of records) {
    const id = {
      departments: record.departmentId,
      members: record.memberId,
      keys: record.keyId,
      models: record.model,
    }[dimension]
    const row = rows.get(id) ?? {
      id,
      name: names.get(id) ?? id,
      calls: 0,
      tokens: 0,
      cost: 0,
    }
    row.calls += record.calls
    row.tokens += record.tokens
    row.cost += record.cost
    rows.set(id, row)
  }
  return [...rows.values()].sort((a, b) => b.cost - a.cost)
}
