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
	require.NoError(t, db.AutoMigrate(&InvitationBatch{}, &InvitationCode{}, &InvitationUse{}))
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
	require.NoError(t, db.AutoMigrate(&InvitationBatch{}, &InvitationCode{}, &InvitationUse{}))
	assert.True(t, db.Migrator().HasTable(&InvitationBatch{}))
	assert.True(t, db.Migrator().HasTable(&InvitationCode{}))
	assert.True(t, db.Migrator().HasTable(&InvitationUse{}))
	assert.True(t, db.Migrator().HasIndex(&InvitationCode{}, "idx_invitation_codes_code"))
	assert.True(t, db.Migrator().HasIndex(&InvitationUse{}, "uk_invitation_code_user"))
}

func TestInvitationConsumeEnforcesUseAndUserLimits(t *testing.T) {
	db := setupInvitationTestDB(t)
	batch, codes, err := CreateInvitationBatch("test", 7, 1, 2, 0)
	require.NoError(t, err)
	require.Len(t, codes, 1)
	assert.Equal(t, 1, batch.CreatedCount)
	require.NoError(t, ConsumeInvitationCode(codes[0], 101))
	require.NoError(t, ConsumeInvitationCode(codes[0], 102))
	assert.ErrorIs(t, ConsumeInvitationCode(codes[0], 101), ErrInvitationCodeExhausted)
	var code InvitationCode
	require.NoError(t, db.First(&code, "code = ?", codes[0]).Error)
	assert.Equal(t, 2, code.UsedCount)
	var uses []InvitationUse
	require.NoError(t, db.Where("invitation_code_id = ?", code.Id).Find(&uses).Error)
	assert.Len(t, uses, 2)
}

func TestInvitationConsumeRejectsInvalidStatesAndDuplicateUser(t *testing.T) {
	db := setupInvitationTestDB(t)
	_, codes, err := CreateInvitationBatch("test", 7, 1, 2, 0)
	require.NoError(t, err)
	assert.ErrorIs(t, ConsumeInvitationCode("", 1), ErrInvitationCodeEmpty)
	assert.ErrorIs(t, ConsumeInvitationCode("missing", 1), ErrInvitationCodeNotFound)
	require.NoError(t, ConsumeInvitationCode(codes[0], 1))
	assert.ErrorIs(t, ConsumeInvitationCode(codes[0], 1), ErrInvitationCodeReused)
	require.NoError(t, ConsumeInvitationCode(codes[0], 2))

	require.NoError(t, db.Create(&InvitationCode{Code: "disabled", Status: InvitationStatusDisabled, MaxUses: 1}).Error)
	assert.ErrorIs(t, ConsumeInvitationCode("disabled", 2), ErrInvitationCodeDisabled)
	require.NoError(t, db.Create(&InvitationCode{Code: "expired", Status: InvitationStatusEnabled, MaxUses: 1, ExpiredTime: common.GetTimestamp() - 1}).Error)
	assert.ErrorIs(t, ConsumeInvitationCode("expired", 2), ErrInvitationCodeExpired)
}

func TestInvitationConsumeRollsBackWithCallerTransaction(t *testing.T) {
	db := setupInvitationTestDB(t)
	_, codes, err := CreateInvitationBatch("test", 7, 1, 1, 0)
	require.NoError(t, err)
	rollbackErr := db.Transaction(func(tx *gorm.DB) error {
		if err := ConsumeInvitationCodeWithTx(tx, codes[0], 99); err != nil {
			return err
		}
		return fmt.Errorf("force rollback")
	})
	require.Error(t, rollbackErr)
	var code InvitationCode
	require.NoError(t, db.First(&code, "code = ?", codes[0]).Error)
	assert.Equal(t, 0, code.UsedCount)
	var count int64
	require.NoError(t, db.Model(&InvitationUse{}).Where("user_id = ?", 99).Count(&count).Error)
	assert.Zero(t, count)
}

func TestCreateInvitationBatchRejectsInvalidParameters(t *testing.T) {
	setupInvitationTestDB(t)
	for _, tc := range []struct {
		name           string
		count, maxUses int
		expired        int64
	}{
		{"zero count", 0, 1, 0}, {"zero uses", 1, 0, 0}, {"expired", 1, 1, common.GetTimestamp() - 1},
	} {
		_, _, err := CreateInvitationBatch(tc.name, 1, tc.count, tc.maxUses, tc.expired)
		assert.Error(t, err, tc.name)
	}
}

func TestSearchInvitationCodesReportsFilteredTotal(t *testing.T) {
	setupInvitationTestDB(t)
	_, _, err := CreateInvitationBatch("total", 1, 3, 1, 0)
	require.NoError(t, err)
	codes, total, err := SearchInvitationCodes(0, "", "", 0, 1)
	require.NoError(t, err)
	assert.Len(t, codes, 1)
	assert.EqualValues(t, 3, total)
}

func TestDeleteInvitationBatchCascadesCodes(t *testing.T) {
	db := setupInvitationTestDB(t)
	batch, _, err := CreateInvitationBatch("cascade", 1, 2, 1, 0)
	require.NoError(t, err)
	require.NoError(t, DeleteInvitationBatchById(batch.Id))
	var count int64
	require.NoError(t, db.Model(&InvitationCode{}).Where("batch_id = ?", batch.Id).Count(&count).Error)
	assert.Zero(t, count)
	assert.ErrorIs(t, db.First(&InvitationBatch{}, batch.Id).Error, gorm.ErrRecordNotFound)
}

func TestImportInvitationBatchSkipsInvalidAndDuplicateCodes(t *testing.T) {
	db := setupInvitationTestDB(t)
	_, existing, err := CreateInvitationBatch("existing", 1, 1, 1, 0)
	require.NoError(t, err)
	batch, codes, skipped, err := ImportInvitationBatch("import", 2, 3, 0, []string{" Alpha ", "", "Alpha", existing[0], strings.Repeat("x", 33)})
	require.NoError(t, err)
	require.NotNil(t, batch)
	assert.Equal(t, []string{"Alpha"}, codes)
	assert.Equal(t, 1, batch.CreatedCount)
	require.Len(t, skipped, 4)
	assert.Equal(t, []int{2, 3, 4, 5}, []int{skipped[0].Line, skipped[1].Line, skipped[2].Line, skipped[3].Line})
	var stored []InvitationCode
	require.NoError(t, db.Where("batch_id = ?", batch.Id).Find(&stored).Error)
	require.Len(t, stored, 1)
	assert.Equal(t, 3, stored[0].MaxUses)
}

func TestImportInvitationBatchRejectsEmptyInputWithoutCreatingBatch(t *testing.T) {
	db := setupInvitationTestDB(t)
	_, _, skipped, err := ImportInvitationBatch("empty", 1, 1, 0, []string{"", strings.Repeat("x", 33)})
	assert.ErrorIs(t, err, ErrInvitationImportEmpty)
	assert.Len(t, skipped, 2)
	var count int64
	require.NoError(t, db.Model(&InvitationBatch{}).Count(&count).Error)
	assert.Zero(t, count)
}
