package service

import (
	"errors"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

var ErrEnterpriseAnalyticsNotFound = errors.New("enterprise analytics resource not found")

type EnterpriseAnalyticsQuery struct {
	Start        int64
	End          int64
	Granularity  string
	DepartmentID int
	EmployeeID   int
	TokenID      int
	Model        string
	Page         int
	PageSize     int
	SortBy       string
	SortOrder    string
}

type EnterpriseUsageMetrics struct {
	RequestCount     int64   `json:"request_count"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	TotalTokens      int64   `json:"total_tokens"`
	Quota            int64   `json:"quota"`
	Cost             float64 `json:"cost"`
	LastUsedAt       int64   `json:"last_used_at,omitempty"`
}

type EnterpriseAnalyticsSummary struct {
	EnterpriseUsageMetrics
	ActiveDepartments  int   `json:"active_departments"`
	ActiveEmployees    int   `json:"active_employees"`
	ActiveTokens       int   `json:"active_tokens"`
	ActiveKeys         int   `json:"active_keys"`
	ActiveModels       int   `json:"active_models"`
	ModelCount         int   `json:"model_count"`
	UnassignedRequests int64 `json:"unassigned_requests"`
}

type EnterpriseTrendPoint struct {
	Timestamp int64  `json:"timestamp"`
	Time      string `json:"time"`
	Label     string `json:"label"`
	EnterpriseUsageMetrics
}

// EnterpriseDimensionTrendPoint is a time bucket attributed to one
// department or employee. It intentionally keeps the dimension identity in
// every point so clients can render a complete multi-series trend.
type EnterpriseDimensionTrendPoint struct {
	Timestamp int64  `json:"timestamp"`
	Time      string `json:"time"`
	Label     string `json:"label"`
	ID        int    `json:"id"`
	Name      string `json:"name"`
	EnterpriseUsageMetrics
}

type EnterpriseDepartmentAnalytics struct {
	Sort                int    `json:"sort"`
	ID                  int    `json:"id"`
	Name                string `json:"name"`
	Description         string `json:"description,omitempty"`
	ParentID            *int   `json:"parent_id,omitempty"`
	Status              int    `json:"status"`
	CreatedAt           int64  `json:"created_at"`
	UpdatedAt           int64  `json:"updated_at"`
	EmployeeCount       int    `json:"employee_count"`
	KeyCount            int    `json:"key_count"`
	ActiveEmployeeCount int    `json:"active_employee_count"`
	EnterpriseUsageMetrics
}

type EnterpriseEmployeeAnalytics struct {
	ID             int    `json:"id"`
	Name           string `json:"name"`
	EmployeeNo     string `json:"employee_no,omitempty"`
	Email          string `json:"email,omitempty"`
	Remark         string `json:"remark,omitempty"`
	DepartmentID   int    `json:"department_id"`
	DepartmentName string `json:"department_name,omitempty"`
	Status         int    `json:"status"`
	CreatedAt      int64  `json:"created_at"`
	UpdatedAt      int64  `json:"updated_at"`
	KeyCount       int    `json:"key_count"`
	PrimaryModel   string `json:"primary_model,omitempty"`
	EnterpriseUsageMetrics
}

type EnterpriseTokenAnalytics struct {
	TokenID        int    `json:"token_id"`
	TokenName      string `json:"token_name"`
	MaskedKey      string `json:"masked_key"`
	Status         int    `json:"status"`
	AssignmentType string `json:"assignment_type,omitempty"`
	DepartmentID   *int   `json:"department_id,omitempty"`
	DepartmentName string `json:"department_name,omitempty"`
	EmployeeID     *int   `json:"employee_id,omitempty"`
	EmployeeName   string `json:"employee_name,omitempty"`
	ValidFrom      int64  `json:"valid_from,omitempty"`
	ValidTo        *int64 `json:"valid_to,omitempty"`
	EnterpriseUsageMetrics
}

type EnterpriseModelAnalytics struct {
	Model             string `json:"model"`
	ActiveDepartments int    `json:"active_departments"`
	ActiveEmployees   int    `json:"active_employees"`
	ActiveTokens      int    `json:"active_tokens"`
	EnterpriseUsageMetrics
}

// EnterpriseModelEmployeeAnalytics contains the token usage attributed to
// one employee for one model. It is returned alongside the model rows so the
// model analytics page can render the per-model employee composition without
// issuing one request per model.
type EnterpriseModelEmployeeAnalytics struct {
	Model        string `json:"model"`
	EmployeeID   int    `json:"employee_id"`
	EmployeeName string `json:"employee_name"`
	EnterpriseUsageMetrics
}

type EnterpriseAnalyticsPage struct {
	Items          any                                `json:"items"`
	Total          int                                `json:"total"`
	Page           int                                `json:"page"`
	PageSize       int                                `json:"page_size"`
	Trend          []EnterpriseTrendPoint             `json:"trend,omitempty"`
	DimensionTrend []EnterpriseDimensionTrendPoint    `json:"dimension_trend,omitempty"`
	ModelEmployee  []EnterpriseModelEmployeeAnalytics `json:"model_employee,omitempty"`
}

type enterpriseAttributedFact struct {
	Fact       model.EnterpriseAnalyticsFact
	Assignment *model.EnterpriseTokenAssignmentHistory
}

type enterpriseAnalyticsData struct {
	query              EnterpriseAnalyticsQuery
	facts              []enterpriseAttributedFact
	departments        []model.EnterpriseDepartment
	employees          []model.EnterpriseEmployee
	tokens             []model.EnterpriseAnalyticsToken
	assignments        []model.EnterpriseTokenAssignmentHistory
	currentAssignments []model.EnterpriseTokenAssignmentHistory
	departmentByID     map[int]model.EnterpriseDepartment
	employeeByID       map[int]model.EnterpriseEmployee
	tokenByID          map[int]model.EnterpriseAnalyticsToken
}

func normalizeEnterpriseAnalyticsQuery(query EnterpriseAnalyticsQuery) EnterpriseAnalyticsQuery {
	if query.End <= 0 {
		query.End = time.Now().Unix()
	}
	if query.Start <= 0 {
		query.Start = query.End - 7*24*60*60
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 {
		query.PageSize = 20
	}
	if query.PageSize > 100 {
		query.PageSize = 100
	}
	query.Model = strings.TrimSpace(query.Model)
	query.SortBy = strings.TrimSpace(query.SortBy)
	query.SortOrder = strings.ToLower(strings.TrimSpace(query.SortOrder))
	if query.SortOrder != "asc" {
		query.SortOrder = "desc"
	}
	if query.Granularity == "" {
		span := query.End - query.Start
		if span <= 2*24*60*60 {
			query.Granularity = "hour"
		} else if span <= 90*24*60*60 {
			query.Granularity = "day"
		} else {
			query.Granularity = "week"
		}
	}
	return query
}

func loadEnterpriseAnalytics(userID int, query EnterpriseAnalyticsQuery) (*enterpriseAnalyticsData, error) {
	query = normalizeEnterpriseAnalyticsQuery(query)
	if userID <= 0 {
		return nil, errors.New("invalid user")
	}
	if query.Start >= query.End {
		return nil, errors.New("start must be before end")
	}
	if query.Granularity != "hour" && query.Granularity != "day" && query.Granularity != "week" {
		return nil, errors.New("invalid granularity")
	}

	departments, err := model.ListEnterpriseDepartments(userID, true)
	if err != nil {
		return nil, err
	}
	employees, err := model.ListEnterpriseEmployees(userID, 0, true)
	if err != nil {
		return nil, err
	}
	tokens, err := model.ListEnterpriseAnalyticsTokens(userID)
	if err != nil {
		return nil, err
	}
	assignments, err := model.ListEnterpriseAnalyticsAssignments(userID, query.Start, query.End)
	if err != nil {
		return nil, err
	}
	currentAssignments, err := model.ListCurrentEnterpriseTokenAssignments(userID)
	if err != nil {
		return nil, err
	}

	data := &enterpriseAnalyticsData{query: query, departments: departments, employees: employees, tokens: tokens, assignments: assignments, currentAssignments: currentAssignments,
		departmentByID: make(map[int]model.EnterpriseDepartment), employeeByID: make(map[int]model.EnterpriseEmployee), tokenByID: make(map[int]model.EnterpriseAnalyticsToken)}
	for _, row := range departments {
		data.departmentByID[row.ID] = row
	}
	for _, row := range employees {
		data.employeeByID[row.ID] = row
	}
	for _, row := range tokens {
		data.tokenByID[row.Id] = row
	}
	if query.DepartmentID > 0 {
		if _, ok := data.departmentByID[query.DepartmentID]; !ok {
			return nil, ErrEnterpriseAnalyticsNotFound
		}
	}
	if query.EmployeeID > 0 {
		employee, ok := data.employeeByID[query.EmployeeID]
		if !ok {
			return nil, ErrEnterpriseAnalyticsNotFound
		}
		if query.DepartmentID > 0 && employee.DepartmentID != query.DepartmentID {
			// Current department is not used for attribution, but this combination
			// is still invalid when the employee has never had a matching interval.
			matched := false
			for _, a := range assignments {
				if a.EmployeeID != nil && *a.EmployeeID == query.EmployeeID && a.DepartmentID == query.DepartmentID {
					matched = true
					break
				}
			}
			if !matched {
				return nil, errors.New("employee does not belong to department in this interval")
			}
		}
	}
	if query.TokenID > 0 {
		if _, ok := data.tokenByID[query.TokenID]; !ok {
			return nil, ErrEnterpriseAnalyticsNotFound
		}
	}

	assignmentByToken := make(map[int][]model.EnterpriseTokenAssignmentHistory)
	tokenFilterSet := make(map[int]struct{})
	for _, assignment := range assignments {
		assignmentByToken[assignment.TokenID] = append(assignmentByToken[assignment.TokenID], assignment)
		if query.DepartmentID > 0 && assignment.DepartmentID != query.DepartmentID {
			continue
		}
		if query.EmployeeID > 0 && (assignment.EmployeeID == nil || *assignment.EmployeeID != query.EmployeeID) {
			continue
		}
		tokenFilterSet[assignment.TokenID] = struct{}{}
	}
	var tokenIDs []int
	if query.TokenID > 0 {
		tokenIDs = []int{query.TokenID}
	} else if query.DepartmentID > 0 || query.EmployeeID > 0 {
		tokenIDs = make([]int, 0, len(tokenFilterSet))
		for tokenID := range tokenFilterSet {
			tokenIDs = append(tokenIDs, tokenID)
		}
		slices.Sort(tokenIDs)
	}
	facts, err := model.QueryEnterpriseAnalyticsFacts(model.EnterpriseAnalyticsFactFilter{UserId: userID, Start: query.Start, End: query.End, TokenIds: tokenIDs, Model: query.Model})
	if err != nil {
		return nil, err
	}
	data.facts = make([]enterpriseAttributedFact, 0, len(facts))
	for _, fact := range facts {
		assignment := assignmentAt(assignmentByToken[fact.TokenId], fact.CreatedAt)
		if query.DepartmentID > 0 && (assignment == nil || assignment.DepartmentID != query.DepartmentID) {
			continue
		}
		if query.EmployeeID > 0 && (assignment == nil || assignment.EmployeeID == nil || *assignment.EmployeeID != query.EmployeeID) {
			continue
		}
		data.facts = append(data.facts, enterpriseAttributedFact{Fact: fact, Assignment: assignment})
	}
	return data, nil
}

func assignmentAt(rows []model.EnterpriseTokenAssignmentHistory, timestamp int64) *model.EnterpriseTokenAssignmentHistory {
	idx := sort.Search(len(rows), func(i int) bool { return rows[i].ValidFrom > timestamp }) - 1
	if idx < 0 {
		return nil
	}
	row := &rows[idx]
	if row.ValidTo != nil && timestamp >= *row.ValidTo {
		return nil
	}
	return row
}

func (m *EnterpriseUsageMetrics) addFact(f model.EnterpriseAnalyticsFact) {
	m.RequestCount += f.RequestCount
	m.PromptTokens += f.PromptTokens
	m.CompletionTokens += f.CompletionTokens
	m.TotalTokens += f.PromptTokens + f.CompletionTokens
	m.Quota += f.Quota
	if f.CreatedAt > m.LastUsedAt {
		m.LastUsedAt = f.CreatedAt
	}
	m.Cost = float64(m.Quota) / common.QuotaPerUnit
}

func summarizeEnterpriseFacts(facts []enterpriseAttributedFact) (EnterpriseAnalyticsSummary, EnterpriseUsageMetrics) {
	var summary EnterpriseAnalyticsSummary
	var unassigned EnterpriseUsageMetrics
	departments, employees, tokens, models := map[int]struct{}{}, map[int]struct{}{}, map[int]struct{}{}, map[string]struct{}{}
	for _, item := range facts {
		summary.EnterpriseUsageMetrics.addFact(item.Fact)
		tokens[item.Fact.TokenId] = struct{}{}
		models[item.Fact.ModelName] = struct{}{}
		if item.Assignment == nil {
			unassigned.addFact(item.Fact)
			continue
		}
		departments[item.Assignment.DepartmentID] = struct{}{}
		if item.Assignment.EmployeeID != nil {
			employees[*item.Assignment.EmployeeID] = struct{}{}
		}
	}
	summary.ActiveDepartments, summary.ActiveEmployees = len(departments), len(employees)
	summary.ActiveTokens, summary.ActiveKeys = len(tokens), len(tokens)
	summary.ActiveModels, summary.ModelCount = len(models), len(models)
	summary.UnassignedRequests = unassigned.RequestCount
	return summary, unassigned
}

func enterpriseTrend(facts []enterpriseAttributedFact, granularity string) []EnterpriseTrendPoint {
	byBucket := make(map[int64]*EnterpriseTrendPoint)
	for _, item := range facts {
		bucket := enterpriseBucket(item.Fact.CreatedAt, granularity)
		point := byBucket[bucket]
		if point == nil {
			t := time.Unix(bucket, 0).UTC()
			point = &EnterpriseTrendPoint{Timestamp: bucket, Time: t.Format(time.RFC3339), Label: t.Format("2006-01-02 15:00")}
			if granularity != "hour" {
				point.Label = t.Format("2006-01-02")
			}
			byBucket[bucket] = point
		}
		point.EnterpriseUsageMetrics.addFact(item.Fact)
	}
	keys := make([]int64, 0, len(byBucket))
	for key := range byBucket {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	result := make([]EnterpriseTrendPoint, 0, len(keys))
	for _, key := range keys {
		result = append(result, *byBucket[key])
	}
	return result
}

func enterpriseDimensionTrend(facts []enterpriseAttributedFact, granularity string, employees bool, departments map[int]model.EnterpriseDepartment, employeeRows map[int]model.EnterpriseEmployee) []EnterpriseDimensionTrendPoint {
	type key struct {
		bucket int64
		id     int
	}
	byBucket := make(map[key]*EnterpriseDimensionTrendPoint)
	for _, item := range facts {
		if item.Assignment == nil || (employees && item.Assignment.EmployeeID == nil) {
			continue
		}

		id := item.Assignment.DepartmentID
		name := ""
		if employees {
			id = *item.Assignment.EmployeeID
			if employee, ok := employeeRows[id]; ok {
				name = employee.Name
			}
		} else if department, ok := departments[id]; ok {
			name = department.Name
		}
		if name == "" {
			if employees {
				name = "Employee"
			} else {
				name = "Department"
			}
		}

		bucket := enterpriseBucket(item.Fact.CreatedAt, granularity)
		bucketKey := key{bucket: bucket, id: id}
		point := byBucket[bucketKey]
		if point == nil {
			t := time.Unix(bucket, 0).UTC()
			label := t.Format("2006-01-02 15:00")
			if granularity != "hour" {
				label = t.Format("2006-01-02")
			}
			point = &EnterpriseDimensionTrendPoint{Timestamp: bucket, Time: t.Format(time.RFC3339), Label: label, ID: id, Name: name}
			byBucket[bucketKey] = point
		}
		point.EnterpriseUsageMetrics.addFact(item.Fact)
	}
	result := make([]EnterpriseDimensionTrendPoint, 0, len(byBucket))
	for _, point := range byBucket {
		result = append(result, *point)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Timestamp != result[j].Timestamp {
			return result[i].Timestamp < result[j].Timestamp
		}
		return result[i].ID < result[j].ID
	})
	return result
}

func attributedEnterpriseFacts(facts []enterpriseAttributedFact, requireEmployee bool) []enterpriseAttributedFact {
	result := make([]enterpriseAttributedFact, 0, len(facts))
	for _, item := range facts {
		if item.Assignment == nil || (requireEmployee && item.Assignment.EmployeeID == nil) {
			continue
		}
		result = append(result, item)
	}
	return result
}

func enterpriseBucket(timestamp int64, granularity string) int64 {
	t := time.Unix(timestamp, 0).UTC()
	switch granularity {
	case "hour":
		return t.Truncate(time.Hour).Unix()
	case "week":
		start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		days := (int(start.Weekday()) + 6) % 7
		return start.AddDate(0, 0, -days).Unix()
	default:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).Unix()
	}
}

func (d *enterpriseAnalyticsData) departmentRows() []EnterpriseDepartmentAnalytics {
	metrics := make(map[int]EnterpriseUsageMetrics)
	active := make(map[int]map[int]struct{})
	for _, item := range d.facts {
		if item.Assignment == nil {
			continue
		}
		id := item.Assignment.DepartmentID
		m := metrics[id]
		m.addFact(item.Fact)
		metrics[id] = m
		if active[id] == nil {
			active[id] = map[int]struct{}{}
		}
		if item.Assignment.EmployeeID != nil {
			active[id][*item.Assignment.EmployeeID] = struct{}{}
		}
	}
	keyCounts := make(map[int]int)
	for _, a := range d.currentAssignments {
		keyCounts[a.DepartmentID]++
	}
	counts := make(map[int]int)
	for _, e := range d.employees {
		if e.DeletedAt == nil {
			counts[e.DepartmentID]++
		}
	}
	rows := make([]EnterpriseDepartmentAnalytics, 0, len(d.departments))
	for _, dep := range d.departments {
		if d.query.DepartmentID > 0 && dep.ID != d.query.DepartmentID {
			continue
		}
		m := metrics[dep.ID]
		rows = append(rows, EnterpriseDepartmentAnalytics{Sort: dep.Sort, ID: dep.ID, Name: dep.Name, Description: dep.Description, ParentID: dep.ParentID, Status: dep.Status, CreatedAt: dep.CreatedAt, UpdatedAt: dep.UpdatedAt, EmployeeCount: counts[dep.ID], KeyCount: keyCounts[dep.ID], ActiveEmployeeCount: len(active[dep.ID]), EnterpriseUsageMetrics: m})
	}
	return rows
}

func (d *enterpriseAnalyticsData) employeeRows() []EnterpriseEmployeeAnalytics {
	metrics := make(map[int]EnterpriseUsageMetrics)
	models := make(map[int]map[string]int64)
	keyCounts := make(map[int]int)
	for _, a := range d.currentAssignments {
		if a.EmployeeID != nil {
			keyCounts[*a.EmployeeID]++
		}
	}
	for _, item := range d.facts {
		if item.Assignment == nil || item.Assignment.EmployeeID == nil {
			continue
		}
		id := *item.Assignment.EmployeeID
		m := metrics[id]
		m.addFact(item.Fact)
		metrics[id] = m
		if models[id] == nil {
			models[id] = map[string]int64{}
		}
		models[id][item.Fact.ModelName] += item.Fact.RequestCount
	}
	rows := make([]EnterpriseEmployeeAnalytics, 0, len(d.employees))
	for _, employee := range d.employees {
		if d.query.EmployeeID > 0 && employee.ID != d.query.EmployeeID {
			continue
		}
		if d.query.DepartmentID > 0 && employee.DepartmentID != d.query.DepartmentID && metrics[employee.ID].RequestCount == 0 {
			continue
		}
		m := metrics[employee.ID]
		primary := ""
		var best int64
		for name, n := range models[employee.ID] {
			if n > best {
				primary, best = name, n
			}
		}
		depName := ""
		if dep, ok := d.departmentByID[employee.DepartmentID]; ok {
			depName = dep.Name
		}
		rows = append(rows, EnterpriseEmployeeAnalytics{ID: employee.ID, Name: employee.Name, EmployeeNo: employee.EmployeeNo, Email: employee.Email, Remark: employee.Remark, DepartmentID: employee.DepartmentID, DepartmentName: depName, Status: employee.Status, CreatedAt: employee.CreatedAt, UpdatedAt: employee.UpdatedAt, KeyCount: keyCounts[employee.ID], PrimaryModel: primary, EnterpriseUsageMetrics: m})
	}
	return rows
}

func (d *enterpriseAnalyticsData) tokenRows() []EnterpriseTokenAnalytics {
	metrics := make(map[int]EnterpriseUsageMetrics)
	current := make(map[int]model.EnterpriseTokenAssignmentHistory)
	for _, a := range d.currentAssignments {
		current[a.TokenID] = a
	}
	for _, item := range d.facts {
		m := metrics[item.Fact.TokenId]
		m.addFact(item.Fact)
		metrics[item.Fact.TokenId] = m
	}
	rows := make([]EnterpriseTokenAnalytics, 0, len(d.tokens))
	for _, token := range d.tokens {
		if d.query.TokenID > 0 && token.Id != d.query.TokenID {
			continue
		}
		if d.query.DepartmentID > 0 || d.query.EmployeeID > 0 {
			matches := false
			for _, a := range d.assignments {
				if a.TokenID == token.Id && (d.query.DepartmentID == 0 || a.DepartmentID == d.query.DepartmentID) && (d.query.EmployeeID == 0 || (a.EmployeeID != nil && *a.EmployeeID == d.query.EmployeeID)) {
					matches = true
					break
				}
			}
			if !matches {
				continue
			}
		}
		m := metrics[token.Id]
		row := EnterpriseTokenAnalytics{TokenID: token.Id, TokenName: token.Name, MaskedKey: model.MaskTokenKey(token.Key), Status: token.Status, EnterpriseUsageMetrics: m}
		if a, ok := current[token.Id]; ok {
			row.AssignmentType, row.DepartmentID, row.EmployeeID, row.ValidFrom, row.ValidTo = a.AssignmentType, &a.DepartmentID, a.EmployeeID, a.ValidFrom, a.ValidTo
			if dep, ok := d.departmentByID[a.DepartmentID]; ok {
				row.DepartmentName = dep.Name
			}
			if a.EmployeeID != nil {
				if emp, ok := d.employeeByID[*a.EmployeeID]; ok {
					row.EmployeeName = emp.Name
				}
			}
		}
		rows = append(rows, row)
	}
	return rows
}

func (d *enterpriseAnalyticsData) modelRows() []EnterpriseModelAnalytics {
	type modelAccum struct {
		m                              EnterpriseUsageMetrics
		departments, employees, tokens map[int]struct{}
	}
	groups := make(map[string]*modelAccum)
	for _, item := range d.facts {
		g := groups[item.Fact.ModelName]
		if g == nil {
			g = &modelAccum{departments: map[int]struct{}{}, employees: map[int]struct{}{}, tokens: map[int]struct{}{}}
			groups[item.Fact.ModelName] = g
		}
		g.m.addFact(item.Fact)
		g.tokens[item.Fact.TokenId] = struct{}{}
		if item.Assignment != nil {
			g.departments[item.Assignment.DepartmentID] = struct{}{}
			if item.Assignment.EmployeeID != nil {
				g.employees[*item.Assignment.EmployeeID] = struct{}{}
			}
		}
	}
	rows := make([]EnterpriseModelAnalytics, 0, len(groups))
	for name, g := range groups {
		rows = append(rows, EnterpriseModelAnalytics{Model: name, ActiveDepartments: len(g.departments), ActiveEmployees: len(g.employees), ActiveTokens: len(g.tokens), EnterpriseUsageMetrics: g.m})
	}
	return rows
}

func (d *enterpriseAnalyticsData) modelEmployeeRows() []EnterpriseModelEmployeeAnalytics {
	type modelEmployeeKey struct {
		model      string
		employeeID int
	}
	groups := make(map[modelEmployeeKey]*EnterpriseModelEmployeeAnalytics)
	for _, item := range d.facts {
		if item.Assignment == nil || item.Assignment.EmployeeID == nil {
			continue
		}
		employeeID := *item.Assignment.EmployeeID
		key := modelEmployeeKey{model: item.Fact.ModelName, employeeID: employeeID}
		row := groups[key]
		if row == nil {
			employeeName := "Employee"
			if employee, ok := d.employeeByID[employeeID]; ok && employee.Name != "" {
				employeeName = employee.Name
			}
			row = &EnterpriseModelEmployeeAnalytics{Model: key.model, EmployeeID: employeeID, EmployeeName: employeeName}
			groups[key] = row
		}
		row.EnterpriseUsageMetrics.addFact(item.Fact)
	}
	rows := make([]EnterpriseModelEmployeeAnalytics, 0, len(groups))
	for _, row := range groups {
		rows = append(rows, *row)
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Model != rows[j].Model {
			return rows[i].Model < rows[j].Model
		}
		if rows[i].TotalTokens != rows[j].TotalTokens {
			return rows[i].TotalTokens > rows[j].TotalTokens
		}
		return rows[i].EmployeeName < rows[j].EmployeeName
	})
	return rows
}

func sortUsageRows[T any](rows []T, sortBy, sortOrder string, metric func(T) EnterpriseUsageMetrics) {
	sort.SliceStable(rows, func(i, j int) bool {
		a, b := metric(rows[i]), metric(rows[j])
		var av, bv float64
		av, bv = a.Cost, b.Cost
		switch sortBy {
		case "request_count", "requests", "calls":
			av, bv = float64(a.RequestCount), float64(b.RequestCount)
		case "total_tokens", "tokens":
			av, bv = float64(a.TotalTokens), float64(b.TotalTokens)
		case "last_used_at":
			av, bv = float64(a.LastUsedAt), float64(b.LastUsedAt)
		case "prompt_tokens":
			av, bv = float64(a.PromptTokens), float64(b.PromptTokens)
		case "completion_tokens":
			av, bv = float64(a.CompletionTokens), float64(b.CompletionTokens)
		}
		if sortOrder == "asc" {
			return av < bv
		}
		return av > bv
	})
}

func pageEnterpriseRows[T any](rows []T, query EnterpriseAnalyticsQuery) EnterpriseAnalyticsPage {
	page, size := query.Page, query.PageSize
	start := (page - 1) * size
	if start > len(rows) {
		start = len(rows)
	}
	end := start + size
	if end > len(rows) {
		end = len(rows)
	}
	return EnterpriseAnalyticsPage{Items: rows[start:end], Total: len(rows), Page: page, PageSize: size}
}

func EnterpriseAnalyticsOverview(userID int, query EnterpriseAnalyticsQuery) (map[string]any, error) {
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return nil, err
	}
	summary, unassigned := summarizeEnterpriseFacts(d.facts)
	summary.ActiveKeys = 0
	now := time.Now().Unix()
	for _, token := range d.tokens {
		if token.Status != common.TokenStatusEnabled || token.DeletedAt.Valid || (token.ExpiredTime != -1 && token.ExpiredTime <= now) {
			continue
		}
		if err := model.ValidateEnterpriseTokenScope(&model.Token{Id: token.Id, UserId: userID, Key: token.Key}); err != nil {
			continue
		}
		if query.TokenID > 0 && token.Id != query.TokenID {
			continue
		}
		if query.EmployeeID > 0 || query.DepartmentID > 0 {
			match := slices.ContainsFunc(d.currentAssignments, func(assignment model.EnterpriseTokenAssignmentHistory) bool {
				return assignment.TokenID == token.Id && (query.DepartmentID == 0 || assignment.DepartmentID == query.DepartmentID) && (query.EmployeeID == 0 || (assignment.EmployeeID != nil && *assignment.EmployeeID == query.EmployeeID))
			})
			if !match {
				continue
			}
		}
		summary.ActiveKeys++
	}
	result := map[string]any{
		"summary":          summary,
		"trend":            enterpriseTrend(d.facts, d.query.Granularity),
		"department_trend": enterpriseDimensionTrend(d.facts, d.query.Granularity, false, d.departmentByID, d.employeeByID),
		"employee_trend":   enterpriseDimensionTrend(d.facts, d.query.Granularity, true, d.departmentByID, d.employeeByID),
		"unassigned":       unassigned,
	}
	deps := d.departmentRows()
	sortUsageRows(deps, "cost", "desc", func(x EnterpriseDepartmentAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	if len(deps) > 5 {
		deps = deps[:5]
	}
	result["top_departments"] = deps
	emps := d.employeeRows()
	sortUsageRows(emps, "cost", "desc", func(x EnterpriseEmployeeAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	if len(emps) > 5 {
		emps = emps[:5]
	}
	result["top_employees"] = emps
	tokens := d.tokenRows()
	sortUsageRows(tokens, "cost", "desc", func(x EnterpriseTokenAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	if len(tokens) > 5 {
		tokens = tokens[:5]
	}
	result["top_tokens"] = tokens
	models := d.modelRows()
	sortUsageRows(models, "cost", "desc", func(x EnterpriseModelAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	if len(models) > 5 {
		models = models[:5]
	}
	result["top_models"] = models
	return result, nil
}

func EnterpriseAnalyticsDepartments(userID int, query EnterpriseAnalyticsQuery) (EnterpriseAnalyticsPage, error) {
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return EnterpriseAnalyticsPage{}, err
	}
	rows := d.departmentRows()
	sortUsageRows(rows, query.SortBy, query.SortOrder, func(x EnterpriseDepartmentAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	page := pageEnterpriseRows(rows, d.query)
	page.Trend = enterpriseTrend(attributedEnterpriseFacts(d.facts, false), d.query.Granularity)
	page.DimensionTrend = enterpriseDimensionTrend(d.facts, d.query.Granularity, false, d.departmentByID, d.employeeByID)
	return page, nil
}
func EnterpriseAnalyticsEmployees(userID int, query EnterpriseAnalyticsQuery) (EnterpriseAnalyticsPage, error) {
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return EnterpriseAnalyticsPage{}, err
	}
	rows := d.employeeRows()
	sortUsageRows(rows, query.SortBy, query.SortOrder, func(x EnterpriseEmployeeAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	page := pageEnterpriseRows(rows, d.query)
	page.Trend = enterpriseTrend(attributedEnterpriseFacts(d.facts, true), d.query.Granularity)
	page.DimensionTrend = enterpriseDimensionTrend(d.facts, d.query.Granularity, true, d.departmentByID, d.employeeByID)
	return page, nil
}
func EnterpriseAnalyticsTokens(userID int, query EnterpriseAnalyticsQuery) (EnterpriseAnalyticsPage, error) {
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return EnterpriseAnalyticsPage{}, err
	}
	rows := d.tokenRows()
	sortUsageRows(rows, query.SortBy, query.SortOrder, func(x EnterpriseTokenAnalytics) EnterpriseUsageMetrics { return x.EnterpriseUsageMetrics })
	return pageEnterpriseRows(rows, d.query), nil
}
func EnterpriseAnalyticsModels(userID int, query EnterpriseAnalyticsQuery) (EnterpriseAnalyticsPage, error) {
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return EnterpriseAnalyticsPage{}, err
	}
	rows := d.modelRows()
	sort.SliceStable(rows, func(i, j int) bool {
		if query.SortBy == "total_tokens" {
			if query.SortOrder == "asc" {
				return rows[i].TotalTokens < rows[j].TotalTokens
			}
			return rows[i].TotalTokens > rows[j].TotalTokens
		}
		if query.SortOrder == "asc" {
			return rows[i].Cost < rows[j].Cost
		}
		return rows[i].Cost > rows[j].Cost
	})
	page := pageEnterpriseRows(rows, d.query)
	page.ModelEmployee = d.modelEmployeeRows()
	return page, nil
}

// EnterpriseAnalyticsDepartmentDetail returns only data belonging to the
// requested department; historical assignment matching is performed by
// loadEnterpriseAnalytics before any ranking is built.

func EnterpriseAnalyticsDepartmentDetail(userID, id int, query EnterpriseAnalyticsQuery) (map[string]any, error) {
	query.DepartmentID = id
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return nil, err
	}
	rows := d.departmentRows()
	if len(rows) != 1 {
		return nil, ErrEnterpriseAnalyticsNotFound
	}
	return map[string]any{"summary": rows[0], "trend": enterpriseTrend(d.facts, d.query.Granularity), "employees": d.employeeRows(), "tokens": d.tokenRows(), "models": d.modelRows()}, nil
}
func EnterpriseAnalyticsEmployeeDetail(userID, id int, query EnterpriseAnalyticsQuery) (map[string]any, error) {
	query.EmployeeID = id
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return nil, err
	}
	rows := d.employeeRows()
	if len(rows) != 1 {
		return nil, ErrEnterpriseAnalyticsNotFound
	}
	return map[string]any{"summary": rows[0], "trend": enterpriseTrend(d.facts, d.query.Granularity), "tokens": d.tokenRows(), "models": d.modelRows()}, nil
}
func EnterpriseAnalyticsTokenDetail(userID, id int, query EnterpriseAnalyticsQuery) (map[string]any, error) {
	query.TokenID = id
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return nil, err
	}
	rows := d.tokenRows()
	if len(rows) != 1 {
		return nil, ErrEnterpriseAnalyticsNotFound
	}
	return map[string]any{"summary": rows[0], "trend": enterpriseTrend(d.facts, d.query.Granularity), "models": d.modelRows()}, nil
}
func EnterpriseAnalyticsModelDetail(userID int, name string, query EnterpriseAnalyticsQuery) (map[string]any, error) {
	query.Model = name
	d, err := loadEnterpriseAnalytics(userID, query)
	if err != nil {
		return nil, err
	}
	rows := d.modelRows()
	if len(rows) != 1 {
		return nil, ErrEnterpriseAnalyticsNotFound
	}
	return map[string]any{"summary": rows[0], "trend": enterpriseTrend(d.facts, d.query.Granularity), "departments": d.departmentRows(), "employees": d.employeeRows(), "tokens": d.tokenRows()}, nil
}
