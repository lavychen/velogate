package controller

import (
	"github.com/QuantumNous/new-api/model"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func ListEnterpriseDepartments(c *gin.Context) {
	rows, err := service.ListEnterpriseDepartments(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rows)
}

func GetEnterpriseDepartment(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	row, err := service.GetEnterpriseDepartment(c.GetInt("id"), id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func CreateEnterpriseDepartment(c *gin.Context) {
	var input service.EnterpriseDepartmentInput
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	row, err := service.CreateEnterpriseDepartment(c.GetInt("id"), input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func UpdateEnterpriseDepartment(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	var input service.EnterpriseDepartmentInput
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	row, err := service.UpdateEnterpriseDepartment(c.GetInt("id"), id, input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func DeleteEnterpriseDepartment(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	if err := service.DeleteEnterpriseDepartment(c.GetInt("id"), id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func ListEnterpriseEmployees(c *gin.Context) {
	departmentID := 0
	if raw := c.Query("department_id"); raw != "" {
		var err error
		departmentID, err = strconv.Atoi(raw)
		if err != nil || departmentID <= 0 {
			common.ApiErrorT(c, "invalid department_id")
			return
		}
	}
	var status *int
	if raw := c.Query("status"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || (value != 0 && value != 1) {
			common.ApiErrorT(c, "invalid status")
			return
		}
		status = &value
	}
	rows, err := service.FilterEnterpriseEmployees(c.GetInt("id"), departmentID, status, c.Query("keyword"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rows)
}

func GetEnterpriseEmployee(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	row, err := service.GetEnterpriseEmployee(c.GetInt("id"), id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func CreateEnterpriseEmployee(c *gin.Context) {
	var input service.EnterpriseEmployeeInput
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	row, err := service.CreateEnterpriseEmployee(c.GetInt("id"), input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func UpdateEnterpriseEmployee(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	var input service.EnterpriseEmployeeInput
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	row, err := service.UpdateEnterpriseEmployee(c.GetInt("id"), id, input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func DeleteEnterpriseEmployee(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	if err := service.DeleteEnterpriseEmployee(c.GetInt("id"), id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func ListEnterpriseTokenAssignments(c *gin.Context) {
	rows, err := service.ListCurrentEnterpriseTokenAssignments(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rows)
}

func GetEnterpriseTokenAssignmentHistory(c *gin.Context) {
	tokenID, ok := parseEnterpriseID(c, "token_id")
	if !ok {
		return
	}
	rows, err := service.GetEnterpriseTokenAssignmentHistory(c.GetInt("id"), tokenID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rows)
}

func GetCurrentEnterpriseTokenAssignment(c *gin.Context) {
	tokenID, ok := parseEnterpriseID(c, "token_id")
	if !ok {
		return
	}
	row, err := service.GetCurrentEnterpriseTokenAssignment(c.GetInt("id"), tokenID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func AssignEnterpriseToken(c *gin.Context) {
	tokenID, ok := parseEnterpriseID(c, "token_id")
	if !ok {
		return
	}
	var input service.EnterpriseAssignmentInput
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	row, err := service.AssignEnterpriseToken(c.GetInt("id"), tokenID, input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, row)
}

func UnassignEnterpriseToken(c *gin.Context) {
	tokenID, ok := parseEnterpriseID(c, "token_id")
	if !ok {
		return
	}
	if err := service.UnassignEnterpriseToken(c.GetInt("id"), tokenID); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func parseEnterpriseID(c *gin.Context, param string) (int, bool) {
	id, err := strconv.Atoi(c.Param(param))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid enterprise request parameter")
		return 0, false
	}
	return id, true
}

func GetEnterpriseWorkspace(c *gin.Context) {
	workspace, err := service.GetEnterpriseWorkspace(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, workspace)
}

func ProvisionEnterpriseWorkspace(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	target, err := model.GetUserById(id, false)
	if err != nil || target.Role >= c.GetInt("role") {
		common.ApiErrorT(c, "Unauthorized, insufficient privileges")
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := common.DecodeJson(c.Request.Body, &input); err != nil {
		common.ApiError(c, err)
		return
	}
	workspace, err := service.ProvisionEnterpriseWorkspace(id, input.Name)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, workspace)
}

func ListEnterpriseWorkspaces(c *gin.Context) {
	ids := make([]int, 0)
	for raw := range strings.SplitSeq(c.Query("user_ids"), ",") {
		id, err := strconv.Atoi(raw)
		if err != nil || id <= 0 || len(ids) >= 100 {
			common.ApiErrorT(c, "Invalid user IDs")
			return
		}
		ids = append(ids, id)
	}
	db, err := model.EnterpriseDB()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var rows []model.EnterpriseWorkspace
	if err := db.Where("newapi_user_id IN ?", ids).Find(&rows).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	names := make(map[int]string, len(rows))
	for _, row := range rows {
		names[row.NewAPIUserID] = row.Name
	}
	// Legacy spaces had no metadata row, but their owner IDs remain authoritative.
	var owners []int
	if err := db.Model(&model.EnterpriseDepartment{}).Where("newapi_user_id IN ? AND deleted_at IS NULL", ids).Distinct("newapi_user_id").Pluck("newapi_user_id", &owners).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	for _, id := range owners {
		if names[id] == "" {
			names[id] = "Enterprise workspace"
		}
	}
	common.ApiSuccess(c, names)
}
