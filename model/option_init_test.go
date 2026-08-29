package model

import (
	"strconv"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestInitOptionMapLoadsDefaultsAndPersistedOptions(t *testing.T) {
	previousDB := DB
	previousOptionMap := common.OptionMap
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&Option{}))
	DB = db
	common.OptionMap = nil
	t.Cleanup(func() {
		DB = previousDB
		common.OptionMap = previousOptionMap
	})

	require.NoError(t, db.Create(&Option{Key: "persisted-test-option", Value: "loaded"}).Error)

	InitOptionMap()

	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	assert.Equal(t, strconv.Itoa(common.FileUploadPermission), common.OptionMap["FileUploadPermission"])
	assert.Equal(t, "loaded", common.OptionMap["persisted-test-option"])
}
