package model

import (
	"fmt"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInvitationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	previousDB, previousLogDB := DB, LOG_DB
	previousMain, previousLog := common.MainDatabaseType(), common.LogDatabaseType()
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	DB, LOG_DB = db, db
	require.NoError(t, db.AutoMigrate(&InvitationCode{}, &InvitationUse{}))
	t.Cleanup(func() {
		DB, LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousMain, previousLog)
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func TestInvitationAutoMigrateIsIdempotent(t *testing.T) {
	db := setupInvitationTestDB(t)
	require.NoError(t, db.AutoMigrate(&InvitationCode{}, &InvitationUse{}))
	assert.False(t, db.Migrator().HasTable("invitation_batches"))
	assert.True(t, db.Migrator().HasTable(&InvitationCode{}))
	assert.True(t, db.Migrator().HasTable(&InvitationUse{}))
}

func TestInvitationConsumeEnforcesUseAndUserLimits(t *testing.T) {
	db := setupInvitationTestDB(t)
	codes, err := CreateInvitationCodes(1, 2, 0)
	require.NoError(t, err)
	require.NoError(t, ConsumeInvitationCode(codes[0], 101))
	require.NoError(t, ConsumeInvitationCode(codes[0], 102))
	assert.ErrorIs(t, ConsumeInvitationCode(codes[0], 101), ErrInvitationCodeExhausted)
	var code InvitationCode
	require.NoError(t, db.First(&code, "code = ?", codes[0]).Error)
	assert.Equal(t, 2, code.UsedCount)
}

func TestInvitationConsumeRejectsInvalidStatesAndDuplicateUser(t *testing.T) {
	db := setupInvitationTestDB(t)
	codes, err := CreateInvitationCodes(1, 2, 0)
	require.NoError(t, err)
	assert.ErrorIs(t, ConsumeInvitationCode("", 1), ErrInvitationCodeEmpty)
	require.NoError(t, ConsumeInvitationCode(codes[0], 1))
	assert.ErrorIs(t, ConsumeInvitationCode(codes[0], 1), ErrInvitationCodeReused)
	require.NoError(t, db.Create(&InvitationCode{Code: "disabled", Status: InvitationStatusDisabled, MaxUses: 1}).Error)
	assert.ErrorIs(t, ConsumeInvitationCode("disabled", 2), ErrInvitationCodeDisabled)
}

func TestInvitationConsumeRollsBackWithCallerTransaction(t *testing.T) {
	db := setupInvitationTestDB(t)
	codes, err := CreateInvitationCodes(1, 1, 0)
	require.NoError(t, err)
	rollbackErr := db.Transaction(func(tx *gorm.DB) error {
		require.NoError(t, ConsumeInvitationCodeWithTx(tx, codes[0], 99))
		return fmt.Errorf("force rollback")
	})
	require.Error(t, rollbackErr)
	var code InvitationCode
	require.NoError(t, db.First(&code, "code = ?", codes[0]).Error)
	assert.Zero(t, code.UsedCount)
}

func TestCreateInvitationCodesRejectsInvalidParameters(t *testing.T) {
	setupInvitationTestDB(t)
	for _, tc := range []struct {
		count, maxUses int
		expired        int64
	}{{0, 1, 0}, {1, 0, 0}, {1, 1, common.GetTimestamp() - 1}} {
		_, err := CreateInvitationCodes(tc.count, tc.maxUses, tc.expired)
		assert.Error(t, err)
	}
}

func TestSearchInvitationCodesReportsFilteredTotal(t *testing.T) {
	setupInvitationTestDB(t)
	_, err := CreateInvitationCodes(3, 1, 0)
	require.NoError(t, err)
	codes, total, err := SearchInvitationCodes("", "", 0, 1)
	require.NoError(t, err)
	assert.Len(t, codes, 1)
	assert.EqualValues(t, 3, total)
}

func TestImportInvitationCodesCountsDuplicatesAndPreservesExisting(t *testing.T) {
	db := setupInvitationTestDB(t)
	existing, err := CreateInvitationCodes(1, 1, 0)
	require.NoError(t, err)
	var before InvitationCode
	require.NoError(t, db.Where("code = ?", existing[0]).First(&before).Error)
	codes, deduplicated, skipped, err := ImportInvitationCodes(3, 0, []string{" Alpha ", "", "Alpha", existing[0], strings.Repeat("x", 33), "Beta"})
	require.NoError(t, err)
	assert.Equal(t, []string{"Alpha", "Beta"}, codes)
	assert.Equal(t, 2, deduplicated)
	assert.Len(t, skipped, 2)
	var after InvitationCode
	require.NoError(t, db.Where("code = ?", existing[0]).First(&after).Error)
	assert.Equal(t, before, after)
}

func TestImportInvitationCodesDuplicatesOnlySucceeds(t *testing.T) {
	db := setupInvitationTestDB(t)
	existing, err := CreateInvitationCodes(1, 1, 0)
	require.NoError(t, err)
	codes, deduplicated, skipped, err := ImportInvitationCodes(3, 0, []string{existing[0], " " + existing[0] + " "})
	require.NoError(t, err)
	assert.Empty(t, codes)
	assert.Equal(t, 2, deduplicated)
	assert.Empty(t, skipped)
	var count int64
	require.NoError(t, db.Model(&InvitationCode{}).Count(&count).Error)
	assert.EqualValues(t, 1, count)
}

func TestImportInvitationCodesRejectsEmptyInput(t *testing.T) {
	db := setupInvitationTestDB(t)
	_, deduplicated, skipped, err := ImportInvitationCodes(1, 0, []string{"", strings.Repeat("x", 33)})
	assert.ErrorIs(t, err, ErrInvitationImportEmpty)
	assert.Zero(t, deduplicated)
	assert.Len(t, skipped, 2)
	var count int64
	require.NoError(t, db.Model(&InvitationCode{}).Count(&count).Error)
	assert.Zero(t, count)
}

func TestMigrateInvitationCodesToStandalonePreservesRows(t *testing.T) {
	db := setupInvitationTestDB(t)
	require.NoError(t, db.Exec("CREATE TABLE invitation_batches (id integer primary key, name text)").Error)
	require.NoError(t, db.Exec("ALTER TABLE invitation_codes ADD COLUMN batch_id integer").Error)
	require.NoError(t, db.Exec("INSERT INTO invitation_batches (id,name) VALUES (1,'legacy')").Error)
	require.NoError(t, db.Exec("INSERT INTO invitation_codes (code,status,created_time,expired_time,max_uses,used_count,last_used_time,batch_id) VALUES ('legacy-a',2,10,20,3,1,30,1),('legacy-b',1,11,0,5,0,0,1)").Error)
	require.NoError(t, migrateInvitationCodesToStandalone())
	require.NoError(t, migrateInvitationCodesToStandalone())
	assert.False(t, db.Migrator().HasTable("invitation_batches"))
	assert.False(t, db.Migrator().HasColumn("invitation_codes", "batch_id"))
	var rows []InvitationCode
	require.NoError(t, db.Order("code").Find(&rows).Error)
	require.Len(t, rows, 2)
	assert.Equal(t, "legacy-a", rows[0].Code)
	assert.Equal(t, 2, rows[0].Status)
	assert.Equal(t, int64(20), rows[0].ExpiredTime)
	assert.Equal(t, 3, rows[0].MaxUses)
	assert.Equal(t, 1, rows[0].UsedCount)
}
