import { api } from '@/lib/api'
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
import { requireServerSuccess } from '@/lib/server-error-message'

import type {
  AnalyticsOverview,
  AnalyticsPage,
  AnalyticsQuery,
  AssignmentInput,
  Department,
  DepartmentInput,
  Employee,
  EmployeeInput,
  EnterpriseListResponse,
  EnterpriseResponse,
  ModelUsage,
  TokenAssignment,
} from './api-types'

function listData<T>(response: EnterpriseListResponse<T>): T[] {
  requireServerSuccess(response)
  if (!response.data) return []
  return Array.isArray(response.data)
    ? response.data
    : (response.data.items ?? [])
}

export async function getDepartments(): Promise<Department[]> {
  const response = (await api.get('/api/enterprise/departments'))
    .data as EnterpriseListResponse<Department>
  return listData(response)
}

export async function createDepartment(
  input: DepartmentInput
): Promise<EnterpriseResponse<Department>> {
  return (await api.post('/api/enterprise/departments', input)).data
}

export async function updateDepartment(
  id: number,
  input: DepartmentInput
): Promise<EnterpriseResponse<Department>> {
  return (await api.put(`/api/enterprise/departments/${id}`, input)).data
}

export async function deleteDepartment(
  id: number
): Promise<EnterpriseResponse<unknown>> {
  return (await api.delete(`/api/enterprise/departments/${id}`)).data
}

export async function getEmployees(departmentId?: number): Promise<Employee[]> {
  const query = departmentId ? `?department_id=${departmentId}` : ''
  const response = (await api.get(`/api/enterprise/employees${query}`))
    .data as EnterpriseListResponse<Employee>
  return listData(response)
}

export async function createEmployee(
  input: EmployeeInput
): Promise<EnterpriseResponse<Employee>> {
  return (await api.post('/api/enterprise/employees', input)).data
}

export async function updateEmployee(
  id: number,
  input: EmployeeInput
): Promise<EnterpriseResponse<Employee>> {
  return (await api.put(`/api/enterprise/employees/${id}`, input)).data
}

export async function deleteEmployee(
  id: number
): Promise<EnterpriseResponse<unknown>> {
  return (await api.delete(`/api/enterprise/employees/${id}`)).data
}

export async function getTokenAssignments(): Promise<TokenAssignment[]> {
  const response = (await api.get('/api/enterprise/token-assignments'))
    .data as EnterpriseListResponse<TokenAssignment>
  return listData(response)
}

export async function updateTokenAssignment(
  tokenId: number,
  input: AssignmentInput
): Promise<EnterpriseResponse<TokenAssignment>> {
  return (await api.put(`/api/enterprise/token-assignments/${tokenId}`, input))
    .data
}

export async function unassignToken(
  tokenId: number
): Promise<EnterpriseResponse<unknown>> {
  return (await api.delete(`/api/enterprise/token-assignments/${tokenId}`)).data
}

export async function getAnalyticsOverview(
  query: AnalyticsQuery = {}
): Promise<AnalyticsOverview> {
  const response = (
    await api.get('/api/enterprise/analytics/overview', { params: query })
  ).data as EnterpriseResponse<AnalyticsOverview>
  requireServerSuccess(response)
  return response.data ?? {}
}

async function getAnalyticsList<T>(
  path: string,
  query: AnalyticsQuery
): Promise<T[]> {
  const response = (await api.get(path, { params: query }))
    .data as EnterpriseListResponse<T>
  return listData(response)
}

async function getAnalyticsPage<T>(
  path: string,
  query: AnalyticsQuery
): Promise<AnalyticsPage<T>> {
  const response = (await api.get(path, { params: query }))
    .data as EnterpriseListResponse<T>
  requireServerSuccess(response)
  const data = response.data
  if (!data) return { items: [] }
  if (Array.isArray(data)) return { items: data }
  return {
    items: data.items ?? [],
    total: data.total,
    page: data.page,
    page_size: data.page_size,
    trend: data.trend ?? [],
    dimension_trend: data.dimension_trend ?? [],
    model_employee: data.model_employee ?? [],
  }
}

export const getDepartmentAnalytics = (query: AnalyticsQuery = {}) =>
  getAnalyticsPage<Department>('/api/enterprise/analytics/departments', query)
export const getEmployeeAnalytics = (query: AnalyticsQuery = {}) =>
  getAnalyticsPage<Employee>('/api/enterprise/analytics/employees', query)
export const getTokenAnalytics = (query: AnalyticsQuery = {}) =>
  getAnalyticsList<TokenAssignment>('/api/enterprise/analytics/tokens', query)
export const getModelAnalytics = (query: AnalyticsQuery = {}) =>
  getAnalyticsPage<ModelUsage>('/api/enterprise/analytics/models', query)

export type Workspace = {
  newapi_user_id: number
  name: string
  created_at?: number
}
export async function getWorkspace(): Promise<Workspace> {
  const response = requireServerSuccess(
    (await api.get('/api/enterprise/workspace'))
      .data as EnterpriseResponse<Workspace>
  )
  if (!response.data) throw new Error('Missing workspace data')
  return response.data
}
export async function provisionWorkspace(userId: number, name: string) {
  return requireServerSuccess(
    (await api.post(`/api/user/${userId}/enterprise`, { name }))
      .data as EnterpriseResponse<Workspace>
  )
}

export const getAnalyticsTokens = (query: AnalyticsQuery = {}) =>
  getAnalyticsPage<TokenAssignment>('/api/enterprise/analytics/tokens', query)

export async function getUserWorkspaces(
  userIds: number[]
): Promise<Record<number, string>> {
  const response = requireServerSuccess(
    (
      await api.get('/api/enterprise/workspaces', {
        params: { user_ids: userIds.join(',') },
      })
    ).data as EnterpriseResponse<Record<number, string>>
  )
  return response.data ?? {}
}
