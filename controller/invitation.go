package controller

import (
	"errors"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const invitationBatchCountMax = 100

type invitationBatchRequest struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Count       int    `json:"count"`
	MaxUses     int    `json:"max_uses"`
	ExpiredTime int64  `json:"expired_time"`
	Status      int    `json:"status"`
}

func GetAllInvitations(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	codes, total, err := model.SearchInvitationCodes(0, "", "", pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(codes)
	common.ApiSuccess(c, pageInfo)
}

func SearchInvitations(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	batchID, _ := strconv.Atoi(c.Query("batch_id"))
	codes, total, err := model.SearchInvitationCodes(batchID, c.Query("keyword"), c.Query("status"), pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(codes)
	common.ApiSuccess(c, pageInfo)
}

func GetInvitation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	code, err := model.GetInvitationCodeById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, code)
}

func CreateInvitations(c *gin.Context) {
	var req invitationBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if utf8.RuneCountInString(req.Name) == 0 || utf8.RuneCountInString(req.Name) > 20 {
		common.ApiError(c, errors.New("invitation batch name must be between 1 and 20 characters"))
		return
	}
	if req.Count <= 0 || req.Count > invitationBatchCountMax {
		common.ApiError(c, errors.New("invitation count must be between 1 and 100"))
		return
	}
	if req.MaxUses <= 0 {
		common.ApiError(c, errors.New("invitation max uses must be positive"))
		return
	}
	if req.ExpiredTime != 0 && req.ExpiredTime < common.GetTimestamp() {
		common.ApiError(c, errors.New("invitation expiration time is invalid"))
		return
	}
	batch, codes, err := model.CreateInvitationBatch(req.Name, c.GetInt("id"), req.Count, req.MaxUses, req.ExpiredTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.create", map[string]interface{}{"batch_id": batch.Id, "count": req.Count})
	common.ApiSuccess(c, gin.H{"batch": batch, "codes": codes})
}

func UpdateInvitation(c *gin.Context) {
	var req invitationBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.ID <= 0 {
		common.ApiError(c, errors.New("invitation id must be positive"))
		return
	}
	if c.Query("status_only") != "" {
		code, err := model.GetInvitationCodeById(req.ID)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if req.Status != model.InvitationStatusEnabled && req.Status != model.InvitationStatusDisabled {
			common.ApiError(c, errors.New("invalid invitation status"))
			return
		}
		code.Status = req.Status
		if err = code.Update(); err != nil {
			common.ApiError(c, err)
			return
		}
		recordManageAudit(c, "invitation.status_update", map[string]interface{}{"id": code.Id, "status": code.Status})
		common.ApiSuccess(c, code)
		return
	}
	code, err := model.GetInvitationCodeById(req.ID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if req.ExpiredTime != 0 && req.ExpiredTime < common.GetTimestamp() {
		common.ApiError(c, errors.New("invitation expiration time is invalid"))
		return
	}
	code.ExpiredTime = req.ExpiredTime
	if req.Status != 0 {
		code.Status = req.Status
	}
	if err = code.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.update", map[string]interface{}{"id": code.Id})
	common.ApiSuccess(c, code)
}

func DeleteInvitation(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err = model.DeleteInvitationCodeById(id); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.delete", map[string]interface{}{"id": id, "count": 1})
	common.ApiSuccess(c, nil)
}

func DeleteInvitationBatch(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err = model.DeleteInvitationBatchById(id); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAudit(c, "invitation.delete_batch", map[string]interface{}{"batch_id": id, "count": 1})
	common.ApiSuccess(c, nil)
}

func DeleteInvalidInvitations(c *gin.Context) {
	now := common.GetTimestamp()
	result := model.DB.Where("status = ? OR (status = ? AND expired_time != 0 AND expired_time < ?)", model.InvitationStatusDisabled, model.InvitationStatusEnabled, now).Delete(&model.InvitationCode{})
	if result.Error != nil {
		common.ApiError(c, result.Error)
		return
	}
	recordManageAudit(c, "invitation.delete_invalid", map[string]interface{}{"count": result.RowsAffected})
	common.ApiSuccess(c, result.RowsAffected)
}
