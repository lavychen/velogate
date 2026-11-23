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
export type EnterpriseStatus = 0 | 1

export interface Department {
  id: number
  name: string
  description?: string
  parent_id?: number | null
  status: number
  created_at: number
  updated_at: number
  sort?: number
  employee_count?: number
  key_count?: number
  active_employee_count?: number
  request_count?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
  last_used_at?: number
}

export interface Employee {
  id: number
  name: string
  employee_no?: string
  email?: string
  remark?: string
  department_id: number
  department_name?: string
  status: number
  created_at: number
  updated_at: number
  key_count?: number
  request_count?: number
  total_tokens?: number
  cost?: number
  primary_model?: string
  last_used_at?: number
}

export interface TokenAssignment {
  token_id: number
  token_name?: string
  masked_key?: string
  assignment_type?: 'employee' | 'department'
  department_id?: number | null
  department_name?: string | null
  employee_id?: number | null
  employee_name?: string | null
  valid_from?: number
  valid_to?: number | null
  status?: number
  request_count?: number
  total_tokens?: number
  cost?: number
  last_used_at?: number
}

export interface TrendPoint {
  date?: string
  time?: string
  label?: string
  requests?: number
  request_count?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
}

export interface DimensionTrendPoint extends TrendPoint {
  id: number
  name: string
}

export interface AnalyticsSummary {
  request_count?: number
  requests?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
  active_departments?: number
  active_employees?: number
  active_tokens?: number
  active_keys?: number
  model_count?: number
  active_models?: number
  unassigned_requests?: number
}

export interface AnalyticsOverview {
  summary?: AnalyticsSummary
  trend?: TrendPoint[]
  department_trend?: DimensionTrendPoint[]
  employee_trend?: DimensionTrendPoint[]
  top_departments?: Department[]
  top_employees?: Employee[]
  top_tokens?: TokenAssignment[]
  top_models?: ModelUsage[]
  unassigned?: AnalyticsSummary
}

export interface AnalyticsPage<T> {
  items: T[]
  total?: number
  page?: number
  page_size?: number
  trend?: TrendPoint[]
  dimension_trend?: DimensionTrendPoint[]
  model_employee?: ModelEmployeeUsage[]
}

export interface ModelUsage {
  model?: string
  name?: string
  request_count?: number
  requests?: number
  total_tokens?: number
  cost?: number
  active_departments?: number
  active_employees?: number
  active_tokens?: number
}

export interface ModelEmployeeUsage {
  model: string
  employee_id: number
  employee_name: string
  request_count?: number
  requests?: number
  total_tokens?: number
  cost?: number
}

export interface AnalyticsQuery {
  start?: string
  end?: string
  granularity?: 'hour' | 'day' | 'week'
  department_id?: number
  employee_id?: number
  token_id?: number
  model?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface EnterpriseListResponse<T> {
  success: boolean
  message?: string
  data?:
    | T[]
    | {
        items?: T[]
        total?: number
        page?: number
        page_size?: number
        trend?: TrendPoint[]
        dimension_trend?: DimensionTrendPoint[]
        model_employee?: ModelEmployeeUsage[]
      }
}

export interface EnterpriseResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface DepartmentInput {
  name: string
  description?: string
  parent_id?: number | null
  sort?: number
  status?: number
}

export interface EmployeeInput {
  name: string
  employee_no?: string
  email?: string
  remark?: string
  department_id: number
  status?: number
}

export interface AssignmentInput {
  assignment_type: 'employee' | 'department'
  department_id: number
  employee_id?: number | null
}
