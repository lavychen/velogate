package service

import (
	"errors"
	"net/mail"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type EnterpriseDepartmentInput struct {
	ParentID    *int   `json:"parent_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
	Status      *int   `json:"status"`
}

type EnterpriseEmployeeInput struct {
	DepartmentID int    `json:"department_id"`
	Name         string `json:"name"`
	EmployeeNo   string `json:"employee_no"`
	Email        string `json:"email"`
	Remark       string `json:"remark"`
	Status       *int   `json:"status"`
}

type EnterpriseAssignmentInput struct {
	AssignmentType string `json:"assignment_type"`
	DepartmentID   int    `json:"department_id"`
	EmployeeID     *int   `json:"employee_id"`
}

func ListEnterpriseDepartments(userID int) ([]EnterpriseDepartmentAnalytics, error) {
	departments, err := model.ListEnterpriseDepartments(userID, false)
	if err != nil {
		return nil, err
	}
	analytics, err := loadEnterpriseAnalytics(userID, currentMonthEnterpriseAnalyticsQuery())
	if err != nil {
		return nil, err
	}
	byID := make(map[int]EnterpriseDepartmentAnalytics, len(analytics.departments))
	for _, row := range analytics.departmentRows() {
		byID[row.ID] = row
	}
	rows := make([]EnterpriseDepartmentAnalytics, 0, len(departments))
	for _, department := range departments {
		if row, ok := byID[department.ID]; ok {
			rows = append(rows, row)
		}
	}
	return rows, nil
}

func GetEnterpriseDepartment(userID, id int) (*model.EnterpriseDepartment, error) {
	return model.GetEnterpriseDepartment(nil, userID, id, false)
}

func CreateEnterpriseDepartment(userID int, input EnterpriseDepartmentInput) (*model.EnterpriseDepartment, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user")
	}
	name, description, status, err := validateDepartmentInput(input)
	if err != nil {
		return nil, err
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	row := &model.EnterpriseDepartment{NewAPIUserID: userID, ParentID: input.ParentID, Name: name, Description: description, Sort: input.Sort, Status: status}
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := validateDepartmentParent(tx, userID, 0, input.ParentID); err != nil {
			return err
		}
		exists, err := model.EnterpriseDepartmentNameExists(tx, userID, input.ParentID, name, 0)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("department name already exists under this parent")
		}
		now := time.Now().Unix()
		row.CreatedAt, row.UpdatedAt = now, now
		return model.CreateEnterpriseDepartmentRecord(tx, row)
	})
	return row, err
}

func UpdateEnterpriseDepartment(userID, id int, input EnterpriseDepartmentInput) (*model.EnterpriseDepartment, error) {
	if id <= 0 {
		return nil, errors.New("invalid department id")
	}
	name, description, status, err := validateDepartmentInput(input)
	if err != nil {
		return nil, err
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if _, err := model.GetEnterpriseDepartment(tx, userID, id, false); err != nil {
			return err
		}
		if err := validateDepartmentParent(tx, userID, id, input.ParentID); err != nil {
			return err
		}
		exists, err := model.EnterpriseDepartmentNameExists(tx, userID, input.ParentID, name, id)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("department name already exists under this parent")
		}
		return model.UpdateEnterpriseDepartmentRecord(tx, userID, id, map[string]any{
			"parent_id": input.ParentID, "name": name, "description": description,
			"sort": input.Sort, "status": status, "updated_at": time.Now().Unix(),
		})
	})
	if err != nil {
		return nil, err
	}
	return model.GetEnterpriseDepartment(nil, userID, id, false)
}

func DeleteEnterpriseDepartment(userID, id int) error {
	db, err := model.EnterpriseDB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&model.EnterpriseEmployee{}).Where("newapi_user_id = ? AND department_id = ? AND deleted_at IS NULL", userID, id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("Move employees before deleting this department")
		}
		if err := tx.Model(&model.EnterpriseDepartment{}).Where("newapi_user_id = ? AND parent_id = ? AND deleted_at IS NULL", userID, id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("Move child departments before deleting this department")
		}
		if err := tx.Model(&model.EnterpriseTokenAssignmentHistory{}).Where("newapi_user_id = ? AND department_id = ? AND valid_to IS NULL", userID, id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("Unassign keys before deleting this department")
		}
		now := time.Now().Unix()
		return model.UpdateEnterpriseDepartmentRecord(tx, userID, id, map[string]any{"status": 0, "updated_at": now, "deleted_at": now})
	})
}

func ListEnterpriseEmployees(userID, departmentID int) ([]model.EnterpriseEmployee, error) {
	if departmentID > 0 {
		if _, err := model.GetEnterpriseDepartment(nil, userID, departmentID, false); err != nil {
			return nil, err
		}
	}
	return model.ListEnterpriseEmployees(userID, departmentID, false)
}

func FilterEnterpriseEmployees(userID, departmentID int, status *int, keyword string) ([]EnterpriseEmployeeAnalytics, error) {
	if departmentID > 0 {
		if _, err := model.GetEnterpriseDepartment(nil, userID, departmentID, false); err != nil {
			return nil, err
		}
	}
	employees, err := model.FilterEnterpriseEmployees(userID, departmentID, status, keyword)
	if err != nil {
		return nil, err
	}
	analytics, err := loadEnterpriseAnalytics(userID, currentMonthEnterpriseAnalyticsQuery())
	if err != nil {
		return nil, err
	}
	byID := make(map[int]EnterpriseEmployeeAnalytics, len(analytics.employees))
	for _, row := range analytics.employeeRows() {
		byID[row.ID] = row
	}
	rows := make([]EnterpriseEmployeeAnalytics, 0, len(employees))
	for _, employee := range employees {
		if row, ok := byID[employee.ID]; ok {
			rows = append(rows, row)
		}
	}
	return rows, nil
}

func currentMonthEnterpriseAnalyticsQuery() EnterpriseAnalyticsQuery {
	now := time.Now().UTC()
	return EnterpriseAnalyticsQuery{
		Start:       time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).Unix(),
		End:         now.Unix() + 1,
		Granularity: "day",
	}
}

func GetEnterpriseEmployee(userID, id int) (*model.EnterpriseEmployee, error) {
	return model.GetEnterpriseEmployee(nil, userID, id, false)
}

func CreateEnterpriseEmployee(userID int, input EnterpriseEmployeeInput) (*model.EnterpriseEmployee, error) {
	clean, status, err := validateEmployeeInput(input)
	if err != nil {
		return nil, err
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	row := &model.EnterpriseEmployee{NewAPIUserID: userID, DepartmentID: input.DepartmentID, Name: clean.Name, EmployeeNo: clean.EmployeeNo, Email: clean.Email, Remark: clean.Remark, Status: status}
	err = db.Transaction(func(tx *gorm.DB) error {
		department, err := model.GetEnterpriseDepartment(tx, userID, input.DepartmentID, false)
		if err != nil || department.Status != 1 {
			return errors.New("department not found")
		}
		now := time.Now().Unix()
		row.CreatedAt, row.UpdatedAt = now, now
		return model.CreateEnterpriseEmployeeRecord(tx, row)
	})
	return row, err
}

func UpdateEnterpriseEmployee(userID, id int, input EnterpriseEmployeeInput) (*model.EnterpriseEmployee, error) {
	clean, status, err := validateEmployeeInput(input)
	if err != nil {
		return nil, err
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if _, err := model.GetEnterpriseEmployee(tx, userID, id, false); err != nil {
			return err
		}
		department, err := model.GetEnterpriseDepartment(tx, userID, input.DepartmentID, false)
		if err != nil || department.Status != 1 {
			return errors.New("department not found")
		}
		return model.UpdateEnterpriseEmployeeRecord(tx, userID, id, map[string]any{
			"department_id": input.DepartmentID, "name": clean.Name, "employee_no": clean.EmployeeNo,
			"email": clean.Email, "remark": clean.Remark, "status": status, "updated_at": time.Now().Unix(),
		})
	})
	if err != nil {
		return nil, err
	}
	return model.GetEnterpriseEmployee(nil, userID, id, false)
}

func DeleteEnterpriseEmployee(userID, id int) error {
	db, err := model.EnterpriseDB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&model.EnterpriseTokenAssignmentHistory{}).Where("newapi_user_id = ? AND employee_id = ? AND valid_to IS NULL", userID, id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("Unassign keys before deleting this employee")
		}
		now := time.Now().Unix()
		return model.UpdateEnterpriseEmployeeRecord(tx, userID, id, map[string]any{"status": 0, "updated_at": now, "deleted_at": now})
	})
}

func ListCurrentEnterpriseTokenAssignments(userID int) ([]model.EnterpriseTokenAssignmentHistory, error) {
	rows, err := model.ListCurrentEnterpriseTokenAssignments(userID)
	if err != nil {
		return nil, err
	}
	return enrichEnterpriseAssignments(userID, rows), nil
}

func GetCurrentEnterpriseTokenAssignment(userID, tokenID int) (*model.EnterpriseTokenAssignmentHistory, error) {
	row, err := model.GetCurrentEnterpriseTokenAssignment(nil, userID, tokenID)
	if err != nil {
		return nil, err
	}
	rows := enrichEnterpriseAssignments(userID, []model.EnterpriseTokenAssignmentHistory{*row})
	return &rows[0], nil
}

func GetEnterpriseTokenAssignmentHistory(userID, tokenID int) ([]model.EnterpriseTokenAssignmentHistory, error) {
	rows, err := model.ListEnterpriseTokenAssignmentHistory(userID, tokenID)
	if err != nil {
		return nil, err
	}
	return enrichEnterpriseAssignments(userID, rows), nil
}

func AssignEnterpriseToken(userID, tokenID int, input EnterpriseAssignmentInput) (*model.EnterpriseTokenAssignmentHistory, error) {
	if _, err := model.GetTokenByIds(tokenID, userID); err != nil {
		return nil, errors.New("token not found")
	}
	if input.AssignmentType != model.EnterpriseAssignmentEmployee && input.AssignmentType != model.EnterpriseAssignmentDepartment {
		return nil, errors.New("assignment_type must be employee or department")
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	var created *model.EnterpriseTokenAssignmentHistory
	err = db.Transaction(func(tx *gorm.DB) error {
		department, err := model.GetEnterpriseDepartment(tx, userID, input.DepartmentID, false)
		if err != nil || department.Status != 1 {
			return errors.New("department not found or disabled")
		}
		if input.AssignmentType == model.EnterpriseAssignmentEmployee {
			if input.EmployeeID == nil || *input.EmployeeID <= 0 {
				return errors.New("employee_id is required for employee assignment")
			}
			employee, err := model.GetEnterpriseEmployee(tx, userID, *input.EmployeeID, false)
			if err != nil || employee.Status != 1 {
				return errors.New("employee not found or disabled")
			}
			if employee.DepartmentID != input.DepartmentID {
				return errors.New("employee does not belong to department")
			}
		} else if input.EmployeeID != nil {
			return errors.New("employee_id must be null for department assignment")
		}

		current, currentErr := model.GetCurrentEnterpriseTokenAssignment(tx, userID, tokenID)
		if currentErr != nil && !errors.Is(currentErr, gorm.ErrRecordNotFound) {
			return currentErr
		}
		if currentErr == nil && sameEnterpriseAssignment(current, input) {
			created = current
			return nil
		}
		now := time.Now().Unix()
		if currentErr == nil {
			// Assignment intervals use Unix seconds and [from,to) boundaries.
			// Two changes in one second must still produce a non-empty ordered
			// history, so advance the cut point when necessary.
			if now <= current.ValidFrom {
				now = current.ValidFrom + 1
			}
			if err := model.CloseCurrentEnterpriseTokenAssignment(tx, userID, tokenID, now); err != nil {
				return err
			}
		}
		actor := userID
		created = &model.EnterpriseTokenAssignmentHistory{NewAPIUserID: userID, TokenID: tokenID, AssignmentType: input.AssignmentType, DepartmentID: input.DepartmentID, EmployeeID: input.EmployeeID, ValidFrom: now, CreatedAt: now, CreatedBy: &actor}
		return model.CreateEnterpriseTokenAssignmentRecord(tx, created)
	})
	if err != nil || created == nil {
		return created, err
	}
	rows := enrichEnterpriseAssignments(userID, []model.EnterpriseTokenAssignmentHistory{*created})
	return &rows[0], nil
}

func UnassignEnterpriseToken(userID, tokenID int) error {
	if _, err := model.GetTokenByIds(tokenID, userID); err != nil {
		return errors.New("token not found")
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		current, err := model.GetCurrentEnterpriseTokenAssignment(tx, userID, tokenID)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		if err != nil {
			return err
		}
		return model.CloseCurrentEnterpriseTokenAssignment(tx, userID, tokenID, max(time.Now().Unix(), current.ValidFrom+1))
	})
}

func validateDepartmentInput(input EnterpriseDepartmentInput) (string, string, int, error) {
	name, description := strings.TrimSpace(input.Name), strings.TrimSpace(input.Description)
	if name == "" || len([]rune(name)) > 100 {
		return "", "", 0, errors.New("department name must be between 1 and 100 characters")
	}
	if len([]rune(description)) > 1000 {
		return "", "", 0, errors.New("department description is too long")
	}
	status := 1
	if input.Status != nil {
		status = *input.Status
	}
	if status != 0 && status != 1 {
		return "", "", 0, errors.New("status must be 0 or 1")
	}
	return name, description, status, nil
}

func validateDepartmentParent(tx *gorm.DB, userID, departmentID int, parentID *int) error {
	if parentID == nil {
		return nil
	}
	if *parentID <= 0 {
		return errors.New("invalid parent department")
	}
	if departmentID > 0 && *parentID == departmentID {
		return errors.New("department cannot be its own parent")
	}
	seen := map[int]bool{}
	current := *parentID
	for current > 0 {
		if seen[current] || (departmentID > 0 && current == departmentID) {
			return errors.New("department hierarchy would form a cycle")
		}
		seen[current] = true
		parent, err := model.GetEnterpriseDepartment(tx, userID, current, false)
		if err != nil {
			return errors.New("parent department not found")
		}
		if parent.Status != 1 {
			return errors.New("parent department is disabled")
		}
		if parent.ParentID == nil {
			break
		}
		current = *parent.ParentID
	}
	return nil
}

func validateEmployeeInput(input EnterpriseEmployeeInput) (EnterpriseEmployeeInput, int, error) {
	input.Name, input.EmployeeNo, input.Email, input.Remark = strings.TrimSpace(input.Name), strings.TrimSpace(input.EmployeeNo), strings.TrimSpace(input.Email), strings.TrimSpace(input.Remark)
	if input.DepartmentID <= 0 {
		return input, 0, errors.New("department_id is required")
	}
	if input.Name == "" || len([]rune(input.Name)) > 100 {
		return input, 0, errors.New("employee name must be between 1 and 100 characters")
	}
	if len([]rune(input.EmployeeNo)) > 100 || len([]rune(input.Email)) > 254 || len([]rune(input.Remark)) > 1000 {
		return input, 0, errors.New("employee field is too long")
	}
	if input.Email != "" {
		if _, err := mail.ParseAddress(input.Email); err != nil {
			return input, 0, errors.New("invalid employee email")
		}
	}
	status := 1
	if input.Status != nil {
		status = *input.Status
	}
	if status != 0 && status != 1 {
		return input, 0, errors.New("status must be 0 or 1")
	}
	return input, status, nil
}

func sameEnterpriseAssignment(current *model.EnterpriseTokenAssignmentHistory, input EnterpriseAssignmentInput) bool {
	if current.AssignmentType != input.AssignmentType || current.DepartmentID != input.DepartmentID {
		return false
	}
	if current.EmployeeID == nil || input.EmployeeID == nil {
		return current.EmployeeID == nil && input.EmployeeID == nil
	}
	return *current.EmployeeID == *input.EmployeeID
}

func enrichEnterpriseAssignments(userID int, rows []model.EnterpriseTokenAssignmentHistory) []model.EnterpriseTokenAssignmentHistory {
	departments, _ := model.ListEnterpriseDepartments(userID, true)
	departmentNames := make(map[int]string, len(departments))
	for _, department := range departments {
		departmentNames[department.ID] = department.Name
	}
	employees, _ := model.ListEnterpriseEmployees(userID, 0, true)
	employeeNames := make(map[int]string, len(employees))
	for _, employee := range employees {
		employeeNames[employee.ID] = employee.Name
	}
	tokenByID := make(map[int]model.Token, len(rows))
	if model.DB != nil {
		const batchSize = 500
		ids := make([]int, 0, len(rows))
		seen := make(map[int]struct{}, len(rows))
		for _, row := range rows {
			if _, ok := seen[row.TokenID]; !ok {
				seen[row.TokenID] = struct{}{}
				ids = append(ids, row.TokenID)
			}
		}
		for start := 0; start < len(ids); start += batchSize {
			end := min(start+batchSize, len(ids))
			var tokens []model.Token
			if err := model.DB.Unscoped().Where("user_id = ? AND id IN ?", userID, ids[start:end]).Find(&tokens).Error; err != nil {
				continue
			}
			for _, token := range tokens {
				tokenByID[token.Id] = token
			}
		}
	}
	for i := range rows {
		rows[i].DepartmentName = departmentNames[rows[i].DepartmentID]
		if rows[i].EmployeeID != nil {
			rows[i].EmployeeName = employeeNames[*rows[i].EmployeeID]
		}
		if token, ok := tokenByID[rows[i].TokenID]; ok {
			rows[i].TokenName, rows[i].MaskedKey, rows[i].Status = token.Name, token.GetMaskedKey(), token.Status
		}
	}
	return rows
}

func GetEnterpriseWorkspace(userID int) (*model.EnterpriseWorkspace, error) {
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	var workspace model.EnterpriseWorkspace
	err = db.Where("newapi_user_id = ?", userID).First(&workspace).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &model.EnterpriseWorkspace{NewAPIUserID: userID}, nil
	}
	return &workspace, err
}

func ProvisionEnterpriseWorkspace(userID int, name string) (*model.EnterpriseWorkspace, error) {
	name = strings.TrimSpace(name)
	if name == "" || len([]rune(name)) > 100 {
		return nil, errors.New("Workspace name must be between 1 and 100 characters")
	}
	user, err := model.GetUserById(userID, false)
	if err != nil || user.Status != 1 {
		return nil, errors.New("User not found or disabled")
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		return nil, err
	}
	workspace := model.EnterpriseWorkspace{NewAPIUserID: userID, Name: name, CreatedAt: time.Now().Unix()}
	// FirstOrCreate makes retries safe and never renames an existing workspace.
	if err := db.Where("newapi_user_id = ?", userID).FirstOrCreate(&workspace).Error; err != nil {
		return nil, err
	}
	return &workspace, nil
}
