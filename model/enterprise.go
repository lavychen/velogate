package model

// Enterprise dimensions live in the existing standalone SQLite extension
// database (SupportDB).  They deliberately contain no token secret or log
// facts; token IDs are references to the core NEWAPI database only.

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var SupportDB *gorm.DB

const (
	EnterpriseAssignmentEmployee   = "employee"
	EnterpriseAssignmentDepartment = "department"
)

type EnterpriseDepartment struct {
	ID           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	NewAPIUserID int    `json:"newapi_user_id" gorm:"column:newapi_user_id;not null;index:idx_enterprise_departments_user"`
	ParentID     *int   `json:"parent_id,omitempty" gorm:"index:idx_enterprise_departments_parent"`
	Name         string `json:"name" gorm:"not null"`
	Description  string `json:"description,omitempty"`
	Sort         int    `json:"sort" gorm:"not null;default:0"`
	Status       int    `json:"status" gorm:"not null;default:1"`
	CreatedAt    int64  `json:"created_at" gorm:"not null"`
	UpdatedAt    int64  `json:"updated_at" gorm:"not null"`
	DeletedAt    *int64 `json:"deleted_at,omitempty" gorm:"index"`
}

func (EnterpriseDepartment) TableName() string { return "enterprise_departments" }

type EnterpriseEmployee struct {
	ID           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	NewAPIUserID int    `json:"newapi_user_id" gorm:"column:newapi_user_id;not null;index:idx_enterprise_employees_user_department,priority:1"`
	DepartmentID int    `json:"department_id" gorm:"not null;index:idx_enterprise_employees_user_department,priority:2"`
	Name         string `json:"name" gorm:"not null"`
	EmployeeNo   string `json:"employee_no,omitempty"`
	Email        string `json:"email,omitempty"`
	Remark       string `json:"remark,omitempty"`
	Status       int    `json:"status" gorm:"not null;default:1"`
	CreatedAt    int64  `json:"created_at" gorm:"not null"`
	UpdatedAt    int64  `json:"updated_at" gorm:"not null"`
	DeletedAt    *int64 `json:"deleted_at,omitempty" gorm:"index"`
}

func (EnterpriseEmployee) TableName() string { return "enterprise_employees" }

type EnterpriseTokenAssignmentHistory struct {
	ID             int    `json:"id" gorm:"primaryKey;autoIncrement"`
	NewAPIUserID   int    `json:"newapi_user_id" gorm:"column:newapi_user_id;not null;index:idx_enterprise_assignment_user"`
	TokenID        int    `json:"token_id" gorm:"not null;index:idx_enterprise_assignment_token_time,priority:1"`
	AssignmentType string `json:"assignment_type" gorm:"not null;index;check:chk_enterprise_assignment_type,assignment_type IN ('employee','department')"`
	DepartmentID   int    `json:"department_id" gorm:"not null;index:idx_enterprise_assignment_department_time,priority:1"`
	EmployeeID     *int   `json:"employee_id,omitempty" gorm:"index:idx_enterprise_assignment_employee_time,priority:1;check:chk_enterprise_assignment_employee,(assignment_type = 'employee' AND employee_id IS NOT NULL) OR (assignment_type = 'department' AND employee_id IS NULL)"`
	ValidFrom      int64  `json:"valid_from" gorm:"not null;index:idx_enterprise_assignment_token_time,priority:2;index:idx_enterprise_assignment_department_time,priority:2;index:idx_enterprise_assignment_employee_time,priority:2"`
	ValidTo        *int64 `json:"valid_to,omitempty" gorm:"index:idx_enterprise_assignment_token_time,priority:3;index:idx_enterprise_assignment_department_time,priority:3;index:idx_enterprise_assignment_employee_time,priority:3"`
	CreatedAt      int64  `json:"created_at" gorm:"not null"`
	CreatedBy      *int   `json:"created_by,omitempty"`
	// Display-only fields populated by the service from the core database.
	// They are never persisted in SQLite and MaskedKey never contains a secret.
	TokenName      string `json:"token_name,omitempty" gorm:"-"`
	MaskedKey      string `json:"masked_key,omitempty" gorm:"-"`
	DepartmentName string `json:"department_name,omitempty" gorm:"-"`
	EmployeeName   string `json:"employee_name,omitempty" gorm:"-"`
	Status         int    `json:"status,omitempty" gorm:"-"`
}

func (EnterpriseTokenAssignmentHistory) TableName() string {
	return "enterprise_token_assignment_history"
}

var ErrEnterpriseDBUnavailable = errors.New("enterprise database is not available")

func EnterpriseDB() (*gorm.DB, error) {
	if SupportDB == nil {
		return nil, ErrEnterpriseDBUnavailable
	}
	return SupportDB, nil
}

func InitEnterpriseSchema(db *gorm.DB) error {
	if db == nil {
		return ErrEnterpriseDBUnavailable
	}
	if err := db.AutoMigrate(&EnterpriseDepartment{}, &EnterpriseEmployee{}, &EnterpriseTokenAssignmentHistory{}, &EnterpriseWorkspace{}); err != nil {
		return err
	}
	// Partial unique indexes preserve assignment history while allowing only
	// one active assignment per token.  They are supported by SQLite 3.8+.
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_assignment_current_token ON enterprise_token_assignment_history(token_id) WHERE valid_to IS NULL").Error; err != nil {
		return err
	}
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_department_root_name ON enterprise_departments(newapi_user_id, name) WHERE parent_id IS NULL AND deleted_at IS NULL").Error; err != nil {
		return err
	}
	return db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_department_child_name ON enterprise_departments(newapi_user_id, parent_id, name) WHERE parent_id IS NOT NULL AND deleted_at IS NULL").Error
}

// InitEnterpriseDB opens the cnvelo extension file without changing core IDs.
func InitEnterpriseDB() error {
	path := strings.TrimSpace(os.Getenv("SUPPORT_DB_PATH"))
	if path == "" {
		path = "/data/support/support.db"
	}
	pathOnly, _, _ := strings.Cut(path, "?")
	if err := os.MkdirAll(filepath.Dir(pathOnly), 0750); err != nil {
		return err
	}
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	if err = db.Exec("PRAGMA busy_timeout = 30000").Error; err == nil {
		err = InitEnterpriseSchema(db)
	}
	if err != nil {
		_ = sqlDB.Close()
		return fmt.Errorf("initialize enterprise database: %w", err)
	}
	SupportDB = db
	return nil
}

// Names are additive metadata; legacy ownership remains newapi_user_id.
type EnterpriseWorkspace struct {
	NewAPIUserID int    `json:"newapi_user_id" gorm:"column:newapi_user_id;primaryKey;autoIncrement:false"`
	Name         string `json:"name"`
	CreatedAt    int64  `json:"created_at"`
}

func (EnterpriseWorkspace) TableName() string { return "enterprise_workspaces" }

// EnsureDefaultEnterpriseWorkspace initializes only accounts without any
// enterprise data. Existing and previously deleted organizations are preserved.
func EnsureDefaultEnterpriseWorkspace(userID int) (*EnterpriseWorkspace, error) {
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	if userID <= 0 {
		return nil, gorm.ErrRecordNotFound
	}
	var user User
	if err := DB.Select("id").Where("id = ? AND status = ?", userID, 1).First(&user).Error; err != nil {
		return nil, err
	}
	workspace := EnterpriseWorkspace{NewAPIUserID: userID}
	err = db.Transaction(func(tx *gorm.DB) error {
		err := tx.Where("newapi_user_id = ?", userID).First(&workspace).Error
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var count int64
		if err := tx.Model(&EnterpriseDepartment{}).Where("newapi_user_id = ?", userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		if err := tx.Model(&EnterpriseEmployee{}).Where("newapi_user_id = ?", userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}

		now := time.Now().Unix()
		workspace.Name, workspace.CreatedAt = "默认企业空间", now
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&workspace)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return tx.Where("newapi_user_id = ?", userID).First(&workspace).Error
		}
		department := EnterpriseDepartment{NewAPIUserID: userID, Name: "默认部门", Status: 1, CreatedAt: now, UpdatedAt: now}
		if err := CreateEnterpriseDepartmentRecord(tx, &department); err != nil {
			return err
		}
		employee := EnterpriseEmployee{NewAPIUserID: userID, DepartmentID: department.ID, Name: "默认员工", Status: 1, CreatedAt: now, UpdatedAt: now}
		return CreateEnterpriseEmployeeRecord(tx, &employee)
	})
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

// ValidateEnterpriseTokenScope is enforced for relay and read-only token use.
// Assignment is attribution, while disabled/deleted assignees revoke access.
func ValidateEnterpriseTokenScope(token *Token) error {
	if SupportDB == nil {
		if strings.HasPrefix(token.Key, "vg-") {
			return ErrEnterpriseDBUnavailable
		}
		return nil
	}
	assignment, err := GetCurrentEnterpriseTokenAssignment(nil, token.UserId, token.Id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	department, err := GetEnterpriseDepartment(nil, token.UserId, assignment.DepartmentID, false)
	if err != nil {
		return err
	}
	if department.Status != 1 {
		return errors.New("enterprise department is disabled")
	}
	if assignment.EmployeeID != nil {
		employee, err := GetEnterpriseEmployee(nil, token.UserId, *assignment.EmployeeID, false)
		if err != nil {
			return err
		}
		if employee.Status != 1 {
			return errors.New("enterprise employee is disabled")
		}
	}
	return nil
}
