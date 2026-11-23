package controller

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func respondEnterpriseAnalytics(c *gin.Context, data any, err error) {
	if err == nil {
		common.ApiSuccess(c, data)
		return
	}
	if errors.Is(err, service.ErrEnterpriseAnalyticsNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "resource not found"})
		return
	}
	common.ApiError(c, err)
}

func enterpriseAnalyticsQuery(c *gin.Context) (service.EnterpriseAnalyticsQuery, bool) {
	query := service.EnterpriseAnalyticsQuery{Granularity: c.Query("granularity"), Model: c.Query("model"), SortBy: c.Query("sort_by"), SortOrder: c.Query("sort_order")}
	var err error
	if query.Start, err = parseEnterpriseAnalyticsTime(c.Query("start")); err != nil {
		common.ApiErrorT(c, "invalid start")
		return query, false
	}
	if query.End, err = parseEnterpriseAnalyticsTime(c.Query("end")); err != nil {
		common.ApiErrorT(c, "invalid end")
		return query, false
	}
	for key, target := range map[string]*int{"department_id": &query.DepartmentID, "employee_id": &query.EmployeeID, "token_id": &query.TokenID, "page": &query.Page, "page_size": &query.PageSize} {
		if raw := c.Query(key); raw != "" {
			value, parseErr := strconv.Atoi(raw)
			if parseErr != nil || value < 0 {
				common.ApiErrorT(c, "Invalid enterprise request parameter")
				return query, false
			}
			*target = value
		}
	}
	return query, true
}

// Accept RFC3339 and Unix seconds (or milliseconds from browser Date APIs),
// normalizing to the seconds used by logs.created_at and assignment history.
func parseEnterpriseAnalyticsTime(raw string) (int64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	if value, err := strconv.ParseInt(raw, 10, 64); err == nil {
		if value > 1_000_000_000_000 {
			value /= 1000
		}
		return value, nil
	}
	value, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return 0, err
	}
	return value.Unix(), nil
}

func GetEnterpriseAnalyticsOverview(c *gin.Context) {
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsOverview(c.GetInt("id"), query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsDepartments(c *gin.Context) {
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsDepartments(c.GetInt("id"), query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsEmployees(c *gin.Context) {
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsEmployees(c.GetInt("id"), query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsTokens(c *gin.Context) {
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsTokens(c.GetInt("id"), query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsModels(c *gin.Context) {
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsModels(c.GetInt("id"), query)
	respondEnterpriseAnalytics(c, data, err)
}

func GetEnterpriseAnalyticsDepartmentDetail(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsDepartmentDetail(c.GetInt("id"), id, query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsEmployeeDetail(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsEmployeeDetail(c.GetInt("id"), id, query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsTokenDetail(c *gin.Context) {
	id, ok := parseEnterpriseID(c, "id")
	if !ok {
		return
	}
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsTokenDetail(c.GetInt("id"), id, query)
	respondEnterpriseAnalytics(c, data, err)
}
func GetEnterpriseAnalyticsModelDetail(c *gin.Context) {
	name := strings.TrimSpace(c.Param("model"))
	if name == "" {
		common.ApiErrorT(c, "invalid model")
		return
	}
	query, ok := enterpriseAnalyticsQuery(c)
	if !ok {
		return
	}
	data, err := service.EnterpriseAnalyticsModelDetail(c.GetInt("id"), name, query)
	respondEnterpriseAnalytics(c, data, err)
}
