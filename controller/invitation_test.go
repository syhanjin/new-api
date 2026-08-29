package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInvitationControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousMain, previousLog := common.MainDatabaseType(), common.LogDatabaseType()
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB, model.LOG_DB = db, db
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Log{}, &model.InvitationBatch{}, &model.InvitationCode{}, &model.InvitationUse{}))
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousMain, previousLog)
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func invitationControllerRequest(t *testing.T, method, path, body string, handler ginHandler) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, path, strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", 42)
	handler(c)
	return recorder
}

type ginHandler func(*gin.Context)

func TestCreateInvitationsRejectsInputBounds(t *testing.T) {
	setupInvitationControllerTestDB(t)
	cases := []struct{ name, body, want string }{
		{"empty name", `{"name":"","count":1,"max_uses":1}`, "between 1 and 20"},
		{"too many", `{"name":"batch","count":101,"max_uses":1}`, "between 1 and 100"},
		{"zero uses", `{"name":"batch","count":1,"max_uses":0}`, "must be positive"},
	}
	for _, tc := range cases {
		recorder := invitationControllerRequest(t, http.MethodPost, "/api/invitation", tc.body, CreateInvitations)
		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Contains(t, recorder.Body.String(), tc.want, tc.name)
		assert.Contains(t, recorder.Body.String(), `"success":false`, tc.name)
	}
}

func TestRegisterRequiresInvitationWhenEnabled(t *testing.T) {
	setupInvitationControllerTestDB(t)
	previousRegister, previousPassword, previousInvitation := common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled
	common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled = true, true, true
	t.Cleanup(func() {
		common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled = previousRegister, previousPassword, previousInvitation
	})
	recorder := invitationControllerRequest(t, http.MethodPost, "/api/user/register", `{"username":"invite-required","password":"password123"}`, Register)
	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), model.ErrInvitationCodeEmpty.Error())
	var count int64
	require.NoError(t, model.DB.Model(&model.User{}).Where("username = ?", "invite-required").Count(&count).Error)
	assert.Zero(t, count)
}

func TestRegisterWithInvalidInvitationDoesNotCreateUser(t *testing.T) {
	setupInvitationControllerTestDB(t)
	previousRegister, previousPassword, previousInvitation := common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled
	common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled = true, true, false
	t.Cleanup(func() {
		common.RegisterEnabled, common.PasswordRegisterEnabled, common.InvitationRegisterEnabled = previousRegister, previousPassword, previousInvitation
	})
	recorder := invitationControllerRequest(t, http.MethodPost, "/api/user/register", `{"username":"invalid-invite","password":"password123","invitation_code":"missing"}`, Register)
	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), model.ErrInvitationCodeNotFound.Error())
	var count int64
	require.NoError(t, model.DB.Model(&model.User{}).Where("username = ?", "invalid-invite").Count(&count).Error)
	assert.Zero(t, count)
}
