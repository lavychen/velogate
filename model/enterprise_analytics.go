package model

import "gorm.io/gorm"

// EnterpriseAnalyticsFact is an already aggregated slice of the logs fact
// table. CreatedAt intentionally remains part of the grouping: assignment
// history boundaries are expressed in Unix seconds and must be applied after
// querying the separate support SQLite database.
type EnterpriseAnalyticsFact struct {
	TokenId          int    `json:"token_id"`
	ModelName        string `json:"model_name"`
	CreatedAt        int64  `json:"created_at"`
	RequestCount     int64  `json:"request_count"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	Quota            int64  `json:"quota"`
}

type EnterpriseAnalyticsFactFilter struct {
	UserId   int
	Start    int64
	End      int64
	TokenIds []int
	Model    string
}

const enterpriseAnalyticsTokenBatchSize = 500

type EnterpriseAnalyticsToken struct {
	Id          int            `json:"token_id"`
	Name        string         `json:"token_name"`
	Key         string         `json:"-"`
	ExpiredTime int64          `json:"-"`
	Status      int            `json:"status"`
	DeletedAt   gorm.DeletedAt `json:"-"`
}

func ListEnterpriseAnalyticsAssignments(userId int, start, end int64) ([]EnterpriseTokenAssignmentHistory, error) {
	if userId <= 0 || start >= end {
		return []EnterpriseTokenAssignmentHistory{}, nil
	}
	db, err := EnterpriseDB()
	if err != nil {
		return nil, err
	}
	var rows []EnterpriseTokenAssignmentHistory
	err = db.Where("newapi_user_id = ? AND valid_from < ? AND (valid_to IS NULL OR valid_to > ?)", userId, end, start).
		Order("token_id ASC, valid_from ASC, id ASC").Find(&rows).Error
	return rows, err
}

func ListEnterpriseAnalyticsTokens(userId int) ([]EnterpriseAnalyticsToken, error) {
	if userId <= 0 {
		return []EnterpriseAnalyticsToken{}, nil
	}
	var tokens []Token
	err := DB.Unscoped().Where("user_id = ?", userId).Order("id ASC").Find(&tokens).Error
	rows := make([]EnterpriseAnalyticsToken, 0, len(tokens))
	for _, token := range tokens {
		rows = append(rows, EnterpriseAnalyticsToken{
			Id: token.Id, Name: token.Name, Key: token.Key,
			Status: token.Status, ExpiredTime: token.ExpiredTime, DeletedAt: token.DeletedAt,
		})
	}
	return rows, err
}

// QueryEnterpriseAnalyticsFacts performs aggregation in the log database and
// never returns log contents, request bodies, IPs, or token secrets. UserId is
// a mandatory predicate even when TokenIds were obtained from a user-scoped
// assignment query, providing defense in depth against tenant data leakage.
func QueryEnterpriseAnalyticsFacts(filter EnterpriseAnalyticsFactFilter) ([]EnterpriseAnalyticsFact, error) {
	if filter.UserId <= 0 || filter.Start >= filter.End {
		return []EnterpriseAnalyticsFact{}, nil
	}

	queryBatch := func(tokenIds []int) ([]EnterpriseAnalyticsFact, error) {
		var facts []EnterpriseAnalyticsFact
		query := LOG_DB.Model(&Log{}).
			Select("token_id, model_name, created_at, COUNT(*) AS request_count, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens, COALESCE(SUM(quota), 0) AS quota").
			Where("user_id = ? AND type = ? AND created_at >= ? AND created_at < ?", filter.UserId, LogTypeConsume, filter.Start, filter.End)
		if tokenIds != nil {
			if len(tokenIds) == 0 {
				return facts, nil
			}
			query = query.Where("token_id IN ?", tokenIds)
		}
		if filter.Model != "" {
			query = query.Where("model_name = ?", filter.Model)
		}
		err := query.Group("token_id, model_name, created_at").Scan(&facts).Error
		return facts, err
	}

	if filter.TokenIds == nil {
		return queryBatch(nil)
	}

	facts := make([]EnterpriseAnalyticsFact, 0)
	for start := 0; start < len(filter.TokenIds); start += enterpriseAnalyticsTokenBatchSize {
		end := min(start+enterpriseAnalyticsTokenBatchSize, len(filter.TokenIds))
		batch, err := queryBatch(filter.TokenIds[start:end])
		if err != nil {
			return nil, err
		}
		facts = append(facts, batch...)
	}
	return facts, nil
}
