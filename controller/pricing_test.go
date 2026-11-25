package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFilterPricingByUsableGroups(t *testing.T) {
	for _, tc := range []struct {
		name        string
		pricing     []model.Pricing
		usableGroup map[string]string
		want        []model.Pricing
	}{
		{
			name: "no models",
		},
		{
			name:        "empty catalog stays empty",
			pricing:     []model.Pricing{},
			usableGroup: map[string]string{"default": "Default"},
			want:        []model.Pricing{},
		},
		{
			name:    "no usable groups hides every model",
			pricing: []model.Pricing{{ModelName: "shared", EnableGroup: []string{"all", "default"}}},
			want:    []model.Pricing{},
		},
		{
			name: "only enabled usable groups are returned",
			pricing: []model.Pricing{
				{ModelName: "shared", EnableGroup: []string{"internal", "vip", "default"}},
				{ModelName: "restricted", EnableGroup: []string{"internal"}},
				{ModelName: "unavailable"},
			},
			usableGroup: map[string]string{"default": "Default", "vip": "VIP", "other": "Other"},
			want:        []model.Pricing{{ModelName: "shared", EnableGroup: []string{"vip", "default"}}},
		},
		{
			name:        "all groups expands to usable groups",
			pricing:     []model.Pricing{{ModelName: "shared", EnableGroup: []string{"all", "internal"}}},
			usableGroup: map[string]string{"vip": "VIP", "default": "Default"},
			want:        []model.Pricing{{ModelName: "shared", EnableGroup: []string{"default", "vip"}}},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, filterPricingByUsableGroups(tc.pricing, tc.usableGroup))
		})
	}
}

func TestFilterPricingByUsableGroupsPreservesSharedCatalog(t *testing.T) {
	pricing := []model.Pricing{{ModelName: "shared", EnableGroup: []string{"internal", "default", "vip"}}}

	defaultPricing := filterPricingByUsableGroups(pricing, map[string]string{"default": "Default"})
	require.Len(t, defaultPricing, 1)
	assert.Equal(t, []string{"default"}, defaultPricing[0].EnableGroup)
	assert.Equal(t, []string{"internal", "default", "vip"}, pricing[0].EnableGroup)

	vipPricing := filterPricingByUsableGroups(pricing, map[string]string{"vip": "VIP"})
	require.Len(t, vipPricing, 1)
	assert.Equal(t, []string{"vip"}, vipPricing[0].EnableGroup)
	assert.Equal(t, []string{"default"}, defaultPricing[0].EnableGroup)
}
