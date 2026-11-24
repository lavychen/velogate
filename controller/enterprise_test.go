package controller

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestEnterpriseDatabaseCompatibility(t *testing.T) {
	for _, database := range []struct {
		name, env string
		kind      common.DatabaseType
	}{
		{"sqlite", "", common.DatabaseTypeSQLite},
		{"mysql", "TEST_MYSQL_DSN", common.DatabaseTypeMySQL},
		{"postgres", "TEST_POSTGRES_DSN", common.DatabaseTypePostgreSQL},
	} {
		for _, separateLog := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/separate_log=%v", database.name, separateLog), func(t *testing.T) {
				dsn := os.Getenv(database.env)
				if database.env != "" && dsn == "" {
					t.Skip(database.env + " is not configured")
				}
				originalDB, originalLog, originalExtension := model.DB, model.LOG_DB, model.SupportDB
				oldMain, oldLog := common.MainDatabaseType(), common.LogDatabaseType()
				oldRedis := common.RedisEnabled
				t.Cleanup(func() {
					model.DB, model.LOG_DB, model.SupportDB = originalDB, originalLog, originalExtension
					common.SetDatabaseTypes(oldMain, oldLog)
					common.RedisEnabled = oldRedis
				})
				common.RedisEnabled = false
				common.SetDatabaseTypes(database.kind, database.kind)
				core, _ := newAuditTestDatabase(t, database.name, dsn)
				model.DB, model.LOG_DB = core, core
				t.Setenv("LOG_SQL_DSN", "")
				require.NoError(t, model.InitLogDB())
				require.NoError(t, core.AutoMigrate(&model.User{}, &model.Token{}, &model.Log{}))
				if separateLog {
					logs, _ := newAuditTestDatabase(t, database.name, dsn)
					require.NoError(t, logs.AutoMigrate(&model.Log{}))
					model.LOG_DB = logs
				}
				versionSQL := "SELECT version()"
				if database.name == "sqlite" {
					versionSQL = "SELECT sqlite_version()"
				}
				var version string
				require.NoError(t, core.Raw(versionSQL).Scan(&version).Error)
				t.Logf("main/log engine: %s", version)
				extensionPath := t.TempDir() + "/support.db"
				extension, err := gorm.Open(sqlite.Open(extensionPath), &gorm.Config{})
				require.NoError(t, err)
				extensionSQL, err := extension.DB()
				require.NoError(t, err)
				t.Cleanup(func() { _ = extensionSQL.Close() })
				// These are the three unchanged cnvelo tables. Existing deployments have
				// no enterprise_workspaces metadata; ownership is always the original ID.
				require.NoError(t, extension.AutoMigrate(&model.EnterpriseDepartment{}, &model.EnterpriseEmployee{}, &model.EnterpriseTokenAssignmentHistory{}))
				now := time.Now().Unix()
				require.NoError(t, extension.Create(&model.EnterpriseDepartment{ID: 41, NewAPIUserID: 101, Name: "Legacy engineering", Status: 1, CreatedAt: now - 100, UpdatedAt: now - 100}).Error)
				require.NoError(t, extension.Create(&model.EnterpriseEmployee{ID: 51, NewAPIUserID: 101, DepartmentID: 41, Name: "Legacy employee", Status: 1, CreatedAt: now - 100, UpdatedAt: now - 100}).Error)
				employeeID := 51
				require.NoError(t, extension.Create(&model.EnterpriseTokenAssignmentHistory{ID: 61, NewAPIUserID: 101, TokenID: 71, AssignmentType: "employee", DepartmentID: 41, EmployeeID: &employeeID, ValidFrom: now - 100, CreatedAt: now - 100}).Error)
				model.SupportDB = extension
				// Exercise startup against both an existing file and a fresh file twice.
				t.Setenv("SUPPORT_DB_PATH", extensionPath)
				require.NoError(t, model.InitEnterpriseDB())
				firstSQL, err := model.SupportDB.DB()
				require.NoError(t, err)
				require.NoError(t, firstSQL.Close())
				require.NoError(t, model.InitEnterpriseDB())
				secondSQL, err := model.SupportDB.DB()
				require.NoError(t, err)
				t.Cleanup(func() { _ = secondSQL.Close() })
				require.NoError(t, model.InitEnterpriseSchema(model.SupportDB))
				for range 2 {
					fresh, err := gorm.Open(sqlite.Open(t.TempDir()+"/fresh.db"), &gorm.Config{})
					require.NoError(t, err)
					require.NoError(t, model.InitEnterpriseSchema(fresh))
					require.NoError(t, model.InitEnterpriseSchema(fresh))
					connection, err := fresh.DB()
					require.NoError(t, err)
					require.NoError(t, connection.Close())
				}
				user := model.User{Id: 101, Username: "legacy-owner", Role: 1, Status: 1, Group: "default", AffCode: "legacy-owner"}
				other := model.User{Id: 201, Username: "other-owner", Role: 1, Status: 1, Group: "default", AffCode: "other-owner"}
				require.NoError(t, core.Create(&user).Error)
				require.NoError(t, core.Create(&other).Error)
				t.Run("default organization", func(t *testing.T) {
					for _, flow := range []string{"registration", "admin", "oauth"} {
						t.Run(flow, func(t *testing.T) {
							newUser := model.User{Username: "default-" + flow, Role: common.RoleCommonUser, Status: common.UserStatusEnabled, Group: "default"}
							if flow == "registration" {
								require.NoError(t, newUser.Insert(0))
							} else {
								require.NoError(t, core.Transaction(func(tx *gorm.DB) error {
									return newUser.InsertWithTx(tx, 0)
								}))
								if flow == "oauth" {
									newUser.FinalizeOAuthUserCreation(0)
								} else {
									newUser.FinishInsert(0)
								}
							}
							var workspace model.EnterpriseWorkspace
							require.NoError(t, model.SupportDB.Where("newapi_user_id = ?", newUser.Id).First(&workspace).Error)
							assert.Equal(t, "默认企业空间", workspace.Name)
							departments, err := model.ListEnterpriseDepartments(newUser.Id, false)
							require.NoError(t, err)
							require.Len(t, departments, 1)
							assert.Equal(t, "默认部门", departments[0].Name)
							assert.Equal(t, 1, departments[0].Status)
							assert.Nil(t, departments[0].ParentID)
							employees, err := model.ListEnterpriseEmployees(newUser.Id, 0, false)
							require.NoError(t, err)
							require.Len(t, employees, 1)
							assert.Equal(t, "默认员工", employees[0].Name)
							assert.Equal(t, 1, employees[0].Status)
							assert.Equal(t, departments[0].ID, employees[0].DepartmentID)
							assert.Empty(t, employees[0].Email)
							_, err = model.GetEnterpriseEmployee(nil, other.Id, employees[0].ID, false)
							require.ErrorIs(t, err, gorm.ErrRecordNotFound)
							for range 2 {
								_, err := service.GetEnterpriseWorkspace(newUser.Id)
								require.NoError(t, err)
								_, err = model.EnsureDefaultEnterpriseWorkspace(newUser.Id)
								require.NoError(t, err)
							}
							afterDepartments, err := model.ListEnterpriseDepartments(newUser.Id, false)
							require.NoError(t, err)
							assert.Equal(t, departments, afterDepartments)
							afterEmployees, err := model.ListEnterpriseEmployees(newUser.Id, 0, false)
							require.NoError(t, err)
							assert.Equal(t, employees, afterEmployees)
							stored, err := model.GetUserById(newUser.Id, false)
							require.NoError(t, err)
							assert.Equal(t, common.RoleCommonUser, stored.Role)
							assert.Equal(t, newUser.AuthVersion, stored.AuthVersion)
						})
					}

					// Existing blank accounts recover from an extension write failure.
					emptyUser := model.User{Username: "default-retry", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, Group: "default", AffCode: "retry"}
					require.NoError(t, core.Create(&emptyUser).Error)
					writeFailure := errors.New("employee insert failed")
					const callbackName = "test:fail_default_employee"
					require.NoError(t, model.SupportDB.Callback().Create().Before("gorm:create").Register(callbackName, func(tx *gorm.DB) {
						if tx.Statement.Table == "enterprise_employees" {
							tx.AddError(writeFailure)
						}
					}))
					t.Cleanup(func() { model.SupportDB.Callback().Create().Remove(callbackName) })
					_, err := model.EnsureDefaultEnterpriseWorkspace(emptyUser.Id)
					require.ErrorIs(t, err, writeFailure)
					var count int64
					require.NoError(t, model.SupportDB.Model(&model.EnterpriseWorkspace{}).Where("newapi_user_id = ?", emptyUser.Id).Count(&count).Error)
					assert.Zero(t, count)
					departments, err := model.ListEnterpriseDepartments(emptyUser.Id, true)
					require.NoError(t, err)
					assert.Empty(t, departments)
					require.NoError(t, model.SupportDB.Callback().Create().Remove(callbackName))
					var wg sync.WaitGroup
					results := make(chan error, 2)
					for range 2 {
						wg.Go(func() {
							_, err := service.GetEnterpriseWorkspace(emptyUser.Id)
							results <- err
						})
					}
					wg.Wait()
					close(results)
					for err := range results {
						require.NoError(t, err)
					}
					departments, err = model.ListEnterpriseDepartments(emptyUser.Id, false)
					require.NoError(t, err)
					require.Len(t, departments, 1)
					employees, err := model.ListEnterpriseEmployees(emptyUser.Id, 0, false)
					require.NoError(t, err)
					require.Len(t, employees, 1)
					assert.Equal(t, departments[0].ID, employees[0].DepartmentID)

					rolledBack := model.User{Username: "default-rollback", Role: common.RoleCommonUser}
					require.ErrorIs(t, core.Transaction(func(tx *gorm.DB) error {
						if err := rolledBack.InsertWithTx(tx, 0); err != nil {
							return err
						}
						return writeFailure
					}), writeFailure)
					_, err = service.GetEnterpriseWorkspace(rolledBack.Id)
					require.ErrorIs(t, err, gorm.ErrRecordNotFound)
					disabled := model.User{Username: "default-disabled", Status: common.UserStatusDisabled, AffCode: "disabled"}
					require.NoError(t, core.Create(&disabled).Error)
					_, err = model.EnsureDefaultEnterpriseWorkspace(disabled.Id)
					require.ErrorIs(t, err, gorm.ErrRecordNotFound)
					_, err = model.EnsureDefaultEnterpriseWorkspace(0)
					require.ErrorIs(t, err, gorm.ErrRecordNotFound)

					// Legacy organization data must not gain extra default members.
					workspace, err := service.GetEnterpriseWorkspace(101)
					require.NoError(t, err)
					assert.Empty(t, workspace.Name)
				})
				require.NoError(t, core.Create(&model.Token{Id: 71, UserId: 101, Name: "Legacy key", Key: strings.Repeat("a", 48), Status: 1, ExpiredTime: -1}).Error)
				require.NoError(t, model.LOG_DB.Create(&model.Log{UserId: 101, Type: model.LogTypeConsume, TokenId: 71, CreatedAt: now - 50, ModelName: "gpt-test", PromptTokens: 7, CompletionTokens: 5, Quota: 500}).Error)
				require.NoError(t, model.LOG_DB.Create(&model.Log{UserId: 201, Type: model.LogTypeConsume, TokenId: 71, CreatedAt: now - 50, ModelName: "private", PromptTokens: 999, Quota: 999999}).Error)
				departments, err := service.ListEnterpriseDepartments(101)
				require.NoError(t, err)
				require.Len(t, departments, 1)
				assert.Equal(t, 41, departments[0].ID)
				assert.EqualValues(t, 1, departments[0].RequestCount)
				assert.EqualValues(t, 12, departments[0].TotalTokens)
				assert.Equal(t, 1, departments[0].KeyCount)
				employees, err := service.FilterEnterpriseEmployees(101, 41, nil, "Legacy")
				require.NoError(t, err)
				require.Len(t, employees, 1)
				assert.Equal(t, 51, employees[0].ID)
				assert.InDelta(t, 500/common.QuotaPerUnit, employees[0].Cost, 1e-12)
				_, err = service.GetEnterpriseDepartment(201, 41)
				require.Error(t, err)
				_, err = service.CreateEnterpriseEmployee(201, service.EnterpriseEmployeeInput{DepartmentID: 41, Name: "Intruder"})
				require.Error(t, err)
				_, err = service.CreateEnterpriseDepartment(101, service.EnterpriseDepartmentInput{Name: "Legacy engineering"})
				require.Error(t, err)
				_, err = service.AssignEnterpriseToken(201, 71, service.EnterpriseAssignmentInput{AssignmentType: "department", DepartmentID: 41})
				require.Error(t, err)
				require.Error(t, service.DeleteEnterpriseEmployee(101, 51))
				require.Error(t, service.DeleteEnterpriseDepartment(101, 41))
				workspace, err := service.ProvisionEnterpriseWorkspace(101, "Legacy company")
				require.NoError(t, err)
				assert.Equal(t, 101, workspace.NewAPIUserID)
				workspace, err = service.ProvisionEnterpriseWorkspace(101, "Retry")
				require.NoError(t, err)
				assert.Equal(t, "Legacy company", workspace.Name)
				adminContext, adminResponse := newAuthenticatedContext(t, "POST", "/api/user/201/enterprise", map[string]any{"name": "Other company"}, 101)
				adminContext.Params = gin.Params{{Key: "id", Value: "201"}}
				adminContext.Set("role", 1)
				ProvisionEnterpriseWorkspace(adminContext)
				assert.False(t, decodeAPIResponse(t, adminResponse).Success)
				adminContext, adminResponse = newAuthenticatedContext(t, "POST", "/api/user/201/enterprise", map[string]any{"name": "Other company"}, 101)
				adminContext.Params = gin.Params{{Key: "id", Value: "201"}}
				adminContext.Set("role", 100)
				ProvisionEnterpriseWorkspace(adminContext)
				assert.True(t, decodeAPIResponse(t, adminResponse).Success)

				_, err = service.ProvisionEnterpriseWorkspace(999, "Missing")
				require.Error(t, err)

				// A key-writing PAT cannot mutate enterprise attribution without its own grant.
				deniedContext, deniedResponse := newAuthenticatedContext(t, "POST", "/api/token/", map[string]any{"name": "Denied scoped key", "unlimited_quota": true, "assignment_type": "employee", "department_id": 41, "employee_id": 51}, 101)
				deniedContext.Set("use_access_token", true)
				deniedContext.Set("access_token_scopes", []string{"api_key:write"})
				AddToken(deniedContext)
				assert.Equal(t, http.StatusForbidden, deniedResponse.Code)
				// Create and attribute a real credential through the production controller.
				ctx, recorder := newAuthenticatedContext(t, "POST", "/api/token/", map[string]any{"name": "New employee key", "unlimited_quota": true, "expired_time": -1, "assignment_type": "employee", "department_id": 41, "employee_id": 51}, 101)
				AddToken(ctx)
				var result struct {
					Success    bool   `json:"success"`
					CreatedKey string `json:"created_key"`
					Data       struct {
						ID  int    `json:"id"`
						Key string `json:"key"`
					} `json:"data"`
				}
				require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &result))
				require.True(t, result.Success, recorder.Body.String())
				require.True(t, strings.HasPrefix(result.CreatedKey, "sk-vg-"))
				assert.NotContains(t, result.Data.Key, result.CreatedKey)
				assert.Equal(t, "no-store", recorder.Header().Get("Cache-Control"))
				created, err := model.GetTokenByIds(result.Data.ID, 101)
				require.NoError(t, err)
				assert.Equal(t, "sk-"+created.Key, result.CreatedKey)
				assignments, err := service.ListCurrentEnterpriseTokenAssignments(101)
				require.NoError(t, err)
				require.Len(t, assignments, 2)
				employees, err = service.FilterEnterpriseEmployees(101, 0, nil, "")
				require.NoError(t, err)
				require.Len(t, employees, 1)
				assert.Equal(t, 2, employees[0].KeyCount)
				overview, err := service.EnterpriseAnalyticsOverview(101, service.EnterpriseAnalyticsQuery{Start: now - 200, End: now + 10})
				require.NoError(t, err)
				summary := overview["summary"].(service.EnterpriseAnalyticsSummary)
				assert.Equal(t, 2, summary.ActiveKeys)
				assert.EqualValues(t, 1, summary.RequestCount)
				// Bearer prefix parsing must preserve vg- and legacy keys alike.
				gin.SetMode(gin.TestMode)
				relay := gin.New()
				relay.GET("/v1/test", middleware.TokenAuthReadOnly(), func(c *gin.Context) { c.Status(204) })
				relay.GET("/v1/relay", middleware.TokenAuth(), func(c *gin.Context) { c.Status(204) })
				request := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
				request.Header.Set("Authorization", "Bearer "+result.CreatedKey)
				response := httptest.NewRecorder()
				relay.ServeHTTP(response, request)
				assert.Equal(t, 204, response.Code, response.Body.String())
				legacyRequest := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
				legacyRequest.Header.Set("Authorization", "Bearer sk-"+strings.Repeat("a", 48))
				legacyResponse := httptest.NewRecorder()
				relay.ServeHTTP(legacyResponse, legacyRequest)
				assert.Equal(t, 204, legacyResponse.Code, legacyResponse.Body.String())

				relayRequest := httptest.NewRequest(http.MethodGet, "/v1/relay", nil)
				relayRequest.Header.Set("Authorization", "Bearer "+result.CreatedKey)
				relayResponse := httptest.NewRecorder()
				relay.ServeHTTP(relayResponse, relayRequest)
				assert.Equal(t, 204, relayResponse.Code, relayResponse.Body.String())
				require.NoError(t, core.Model(&model.Token{}).Where("id = ?", created.Id).Update("expired_time", now-1).Error)
				relayResponse = httptest.NewRecorder()
				relay.ServeHTTP(relayResponse, relayRequest)
				assert.Equal(t, http.StatusUnauthorized, relayResponse.Code)
				require.NoError(t, core.Model(&model.Token{}).Where("id = ?", created.Id).Updates(map[string]any{"expired_time": -1, "status": 1}).Error)
				// New explicitly disabled records must remain disabled despite legacy GORM defaults.
				off := 0
				disabledDepartment, err := service.CreateEnterpriseDepartment(101, service.EnterpriseDepartmentInput{Name: "Disabled department", Status: &off})
				require.NoError(t, err)
				assert.Zero(t, disabledDepartment.Status)
				disabledEmployee, err := service.CreateEnterpriseEmployee(101, service.EnterpriseEmployeeInput{Name: "Disabled employee", DepartmentID: 41, Status: &off})
				require.NoError(t, err)
				assert.Zero(t, disabledEmployee.Status)
				_, err = service.AssignEnterpriseToken(101, 71, service.EnterpriseAssignmentInput{AssignmentType: "employee", DepartmentID: 41, EmployeeID: &disabledEmployee.ID})
				require.Error(t, err)

				scopedContext, scopedResponse := newAuthenticatedContext(t, "POST", "/api/token/", map[string]any{"name": "Scoped key without reveal", "unlimited_quota": true, "expired_time": -1, "assignment_type": "employee", "department_id": 41, "employee_id": 51}, 101)
				scopedContext.Set("use_access_token", true)
				scopedContext.Set("access_token_scopes", []string{"api_key:write", "enterprise:write"})
				AddToken(scopedContext)
				assert.True(t, decodeAPIResponse(t, scopedResponse).Success)
				assert.NotContains(t, scopedResponse.Body.String(), "created_key")
				disabled := 0
				_, err = service.UpdateEnterpriseEmployee(101, 51, service.EnterpriseEmployeeInput{DepartmentID: 41, Name: "Legacy employee", Status: &disabled})
				require.NoError(t, err)
				response = httptest.NewRecorder()
				relay.ServeHTTP(response, request)
				assert.Equal(t, http.StatusUnauthorized, response.Code)
				overview, err = service.EnterpriseAnalyticsOverview(101, service.EnterpriseAnalyticsQuery{Start: now - 200, End: now + 10})
				require.NoError(t, err)
				assert.Zero(t, overview["summary"].(service.EnterpriseAnalyticsSummary).ActiveKeys)
				// Invalid assignment creation must not leave an unassigned live token.
				ctx, recorder = newAuthenticatedContext(t, "POST", "/api/token/", map[string]any{"name": "Rejected key", "unlimited_quota": true, "assignment_type": "employee", "department_id": 41, "employee_id": 51}, 101)
				AddToken(ctx)
				assert.False(t, decodeAPIResponse(t, recorder).Success)
				var remaining int64
				require.NoError(t, core.Model(&model.Token{}).Where("name = ?", "Rejected key").Count(&remaining).Error)
				assert.Zero(t, remaining)
				require.NoError(t, service.UnassignEnterpriseToken(101, 71))
				require.NoError(t, service.UnassignEnterpriseToken(101, 71))
				history, err := service.GetEnterpriseTokenAssignmentHistory(101, 71)
				require.NoError(t, err)
				require.Len(t, history, 1)
				require.NotNil(t, history[0].ValidTo)
				assert.Greater(t, *history[0].ValidTo, history[0].ValidFrom)
				// All pre-existing IDs and historical attribution survive the upgrade.
				require.NoError(t, model.InitEnterpriseSchema(model.SupportDB))
				var legacy model.EnterpriseTokenAssignmentHistory
				require.NoError(t, model.SupportDB.First(&legacy, 61).Error)
				assert.Equal(t, 71, legacy.TokenID)
				assert.Equal(t, 51, *legacy.EmployeeID)
				var indexes int64
				require.NoError(t, model.SupportDB.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name IN ('idx_enterprise_assignment_current_token', 'idx_enterprise_department_root_name', 'idx_enterprise_department_child_name')").Scan(&indexes).Error)
				assert.EqualValues(t, 3, indexes)
			})
		}
	}
}

func TestEnterpriseClickHouseLogs(t *testing.T) {
	dsn := os.Getenv("TEST_CLICKHOUSE_DSN")
	if dsn == "" {
		t.Skip("TEST_CLICKHOUSE_DSN is not configured")
	}
	oldDB, oldLog, oldExtension := model.DB, model.LOG_DB, model.SupportDB
	oldMain, oldLogKind := common.MainDatabaseType(), common.LogDatabaseType()
	oldMaster := common.IsMasterNode
	t.Cleanup(func() {
		model.DB, model.LOG_DB, model.SupportDB = oldDB, oldLog, oldExtension
		common.SetDatabaseTypes(oldMain, oldLogKind)
		common.IsMasterNode = oldMaster
	})
	common.IsMasterNode = true
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeClickHouse)
	core, _ := newAuditTestDatabase(t, "sqlite", "")
	model.DB = core
	require.NoError(t, core.AutoMigrate(&model.User{}, &model.Token{}))
	_, isolated := newAuditTestDatabase(t, "clickhouse", dsn)
	t.Setenv("LOG_SQL_DSN", isolated)
	require.NoError(t, model.InitLogDB())
	require.NoError(t, model.InitLogDB())
	var version string
	require.NoError(t, model.LOG_DB.Raw("SELECT version()").Scan(&version).Error)
	t.Logf("ClickHouse log engine: %s", version)
	extension, _ := newAuditTestDatabase(t, "sqlite", "")
	model.SupportDB = extension
	require.NoError(t, model.InitEnterpriseSchema(extension))
	require.NoError(t, model.InitEnterpriseSchema(extension))
	now := time.Now().Unix()
	department, err := service.CreateEnterpriseDepartment(101, service.EnterpriseDepartmentInput{Name: "Engineering"})
	require.NoError(t, err)
	employee, err := service.CreateEnterpriseEmployee(101, service.EnterpriseEmployeeInput{Name: "Ada", DepartmentID: department.ID})
	require.NoError(t, err)
	require.NoError(t, core.Create(&model.Token{Id: 71, UserId: 101, Key: "clickhouse-test-secret", Status: 1, ExpiredTime: -1}).Error)
	_, err = service.AssignEnterpriseToken(101, 71, service.EnterpriseAssignmentInput{AssignmentType: "employee", DepartmentID: department.ID, EmployeeID: &employee.ID})
	require.NoError(t, err)
	require.NoError(t, model.LOG_DB.Create(&model.Log{UserId: 101, Type: model.LogTypeConsume, TokenId: 71, CreatedAt: now, ModelName: "gpt-test", PromptTokens: 7, CompletionTokens: 5, Quota: 500}).Error)
	require.NoError(t, model.LOG_DB.Create(&model.Log{UserId: 201, Type: model.LogTypeConsume, TokenId: 71, CreatedAt: now, ModelName: "private", PromptTokens: 9000, Quota: 90000}).Error)
	rows, err := service.FilterEnterpriseEmployees(101, department.ID, nil, "Ada")
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.EqualValues(t, 1, rows[0].RequestCount)
	assert.EqualValues(t, 12, rows[0].TotalTokens)
	assert.InDelta(t, 500/common.QuotaPerUnit, rows[0].Cost, 1e-12)
}
