package model

import (
	"strings"

	"gorm.io/gorm"
)

func ListEnterpriseDepartments(userID int, includeDeleted bool) ([]EnterpriseDepartment, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	query := db.Where("newapi_user_id = ?", userID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	var rows []EnterpriseDepartment
	err = query.Order("sort ASC, id ASC").Find(&rows).Error
	return rows, err
}

func GetEnterpriseDepartment(tx *gorm.DB, userID, id int, includeDeleted bool) (*EnterpriseDepartment, error) {
	if tx == nil {
		var err error
		tx, err = EnterpriseDB()
		if err != nil {
			return nil, err
		}
	}
	query := tx.Where("id = ? AND newapi_user_id = ?", id, userID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	var row EnterpriseDepartment
	if err := query.First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func EnterpriseDepartmentNameExists(tx *gorm.DB, userID int, parentID *int, name string, excludeID int) (bool, error) {
	query := tx.Model(&EnterpriseDepartment{}).Where("newapi_user_id = ? AND name = ? AND deleted_at IS NULL", userID, name)
	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}
	if excludeID > 0 {
		query = query.Where("id <> ?", excludeID)
	}
	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}

func CreateEnterpriseDepartmentRecord(tx *gorm.DB, row *EnterpriseDepartment) error {
	status := row.Status
	if err := tx.Create(row).Error; err != nil {
		return err
	}
	if status == 0 {
		row.Status = 0
		return tx.Model(row).Update("status", 0).Error
	}
	return nil
}

func UpdateEnterpriseDepartmentRecord(tx *gorm.DB, userID, id int, values map[string]any) error {
	result := tx.Model(&EnterpriseDepartment{}).Where("id = ? AND newapi_user_id = ? AND deleted_at IS NULL", id, userID).Updates(values)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func ListEnterpriseEmployees(userID int, departmentID int, includeDeleted bool) ([]EnterpriseEmployee, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	query := db.Where("newapi_user_id = ?", userID)
	if departmentID > 0 {
		query = query.Where("department_id = ?", departmentID)
	}
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	var rows []EnterpriseEmployee
	err = query.Order("id ASC").Find(&rows).Error
	return rows, err
}

func FilterEnterpriseEmployees(userID, departmentID int, status *int, keyword string) ([]EnterpriseEmployee, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	query := db.Where("newapi_user_id = ? AND deleted_at IS NULL", userID)
	if departmentID > 0 {
		query = query.Where("department_id = ?", departmentID)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		pattern := "%" + strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(keyword, "!", "!!"), "%", "!%"), "_", "!_") + "%"
		query = query.Where("(name LIKE ? ESCAPE '!' OR employee_no LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!')", pattern, pattern, pattern)
	}
	var rows []EnterpriseEmployee
	err = query.Order("id ASC").Find(&rows).Error
	return rows, err
}

func GetEnterpriseEmployee(tx *gorm.DB, userID, id int, includeDeleted bool) (*EnterpriseEmployee, error) {
	if tx == nil {
		var err error
		tx, err = EnterpriseDB()
		if err != nil {
			return nil, err
		}
	}
	query := tx.Where("id = ? AND newapi_user_id = ?", id, userID)
	if !includeDeleted {
		query = query.Where("deleted_at IS NULL")
	}
	var row EnterpriseEmployee
	if err := query.First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func CreateEnterpriseEmployeeRecord(tx *gorm.DB, row *EnterpriseEmployee) error {
	status := row.Status
	if err := tx.Create(row).Error; err != nil {
		return err
	}
	if status == 0 {
		row.Status = 0
		return tx.Model(row).Update("status", 0).Error
	}
	return nil
}

func UpdateEnterpriseEmployeeRecord(tx *gorm.DB, userID, id int, values map[string]any) error {
	result := tx.Model(&EnterpriseEmployee{}).Where("id = ? AND newapi_user_id = ? AND deleted_at IS NULL", id, userID).Updates(values)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func GetCurrentEnterpriseTokenAssignment(tx *gorm.DB, userID, tokenID int) (*EnterpriseTokenAssignmentHistory, error) {
	if tx == nil {
		var err error
		tx, err = EnterpriseDB()
		if err != nil {
			return nil, err
		}
	}
	var row EnterpriseTokenAssignmentHistory
	if err := tx.Where("newapi_user_id = ? AND token_id = ? AND valid_to IS NULL", userID, tokenID).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func ListCurrentEnterpriseTokenAssignments(userID int) ([]EnterpriseTokenAssignmentHistory, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	var rows []EnterpriseTokenAssignmentHistory
	err = db.Where("newapi_user_id = ? AND valid_to IS NULL", userID).Order("token_id ASC").Find(&rows).Error
	return rows, err
}

func ListEnterpriseTokenAssignmentHistory(userID, tokenID int) ([]EnterpriseTokenAssignmentHistory, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	var rows []EnterpriseTokenAssignmentHistory
	err = db.Where("newapi_user_id = ? AND token_id = ?", userID, tokenID).Order("valid_from DESC, id DESC").Find(&rows).Error
	return rows, err
}

func CloseCurrentEnterpriseTokenAssignment(tx *gorm.DB, userID, tokenID int, validTo int64) error {
	return tx.Model(&EnterpriseTokenAssignmentHistory{}).
		Where("newapi_user_id = ? AND token_id = ? AND valid_to IS NULL", userID, tokenID).
		Update("valid_to", validTo).Error
}

func CreateEnterpriseTokenAssignmentRecord(tx *gorm.DB, row *EnterpriseTokenAssignmentHistory) error {
	return tx.Create(row).Error
}
