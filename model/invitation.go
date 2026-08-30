package model

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Invitation status values intentionally mirror the redemption status shape,
// while remaining independent from promotion and redemption semantics.
const (
	InvitationStatusEnabled  = 1
	InvitationStatusDisabled = 2
)

var (
	ErrInvitationCodeEmpty      = errors.New("invitation code is empty")
	ErrInvitationCodeNotFound   = errors.New("invitation code not found")
	ErrInvitationCodeDisabled   = errors.New("invitation code is disabled")
	ErrInvitationCodeExpired    = errors.New("invitation code expired")
	ErrInvitationCodeExhausted  = errors.New("invitation code exhausted")
	ErrInvitationCodeReused     = errors.New("invitation code already used by this user")
	ErrInvitationCodeGeneration = errors.New("failed to generate invitation code")
	ErrInvitationImportEmpty    = errors.New("invitation import has no valid codes")
)

type InvitationImportSkipped struct {
	Line   int    `json:"line"`
	Code   string `json:"code"`
	Reason string `json:"reason"`
}

type InvitationBatch struct {
	Id           int            `json:"id"`
	Name         string         `json:"name" gorm:"index"`
	CreatedBy    int            `json:"created_by" gorm:"index"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint"`
	ExpiredTime  int64          `json:"expired_time" gorm:"bigint"`
	MaxUses      int            `json:"max_uses"`
	Status       int            `json:"status" gorm:"default:1;index"`
	CreatedCount int            `json:"created_count"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type InvitationCode struct {
	Id           int            `json:"id"`
	BatchId      int            `json:"batch_id" gorm:"index"`
	Code         string         `json:"code" gorm:"type:char(32);uniqueIndex"`
	Status       int            `json:"status" gorm:"default:1;index"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint"`
	ExpiredTime  int64          `json:"expired_time" gorm:"bigint;index"`
	MaxUses      int            `json:"max_uses"`
	UsedCount    int            `json:"used_count"`
	LastUsedTime int64          `json:"last_used_time" gorm:"bigint"`
	Name         string         `json:"name" gorm:"-"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type InvitationUse struct {
	Id               int   `json:"id"`
	InvitationCodeId int   `json:"invitation_code_id" gorm:"uniqueIndex:uk_invitation_code_user,priority:1;index"`
	UserId           int   `json:"user_id" gorm:"uniqueIndex:uk_invitation_code_user,priority:2;index"`
	UsedTime         int64 `json:"used_time" gorm:"bigint;index"`
}

// SearchInvitationBatches returns batches with optional name/id and status filters.
func SearchInvitationBatches(keyword, status string, startIdx, num int) (batches []*InvitationBatch, total int64, err error) {
	query := DB.Model(&InvitationBatch{})
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		query = query.Where("name LIKE ?", keyword+"%")
		if id, parseErr := parsePositiveID(keyword); parseErr == nil {
			query = DB.Model(&InvitationBatch{}).Where("id = ? OR name LIKE ?", id, keyword+"%")
		}
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err = query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&batches).Error; err != nil {
		return nil, 0, err
	}
	return batches, total, nil
}

func parsePositiveID(value string) (int, error) {
	var id int
	_, err := fmt.Sscanf(value, "%d", &id)
	if err != nil || id <= 0 || fmt.Sprintf("%d", id) != value {
		return 0, errors.New("not an id")
	}
	return id, nil
}

func GetInvitationBatchById(id int) (*InvitationBatch, error) {
	if id <= 0 {
		return nil, gorm.ErrRecordNotFound
	}
	batch := &InvitationBatch{}
	return batch, DB.First(batch, "id = ?", id).Error
}

func GetInvitationCodeById(id int) (*InvitationCode, error) {
	if id <= 0 {
		return nil, gorm.ErrRecordNotFound
	}
	code := &InvitationCode{}
	return code, DB.First(code, "id = ?", id).Error
}

func SearchInvitationCodes(batchID int, keyword, status string, startIdx, num int) (codes []*InvitationCode, total int64, err error) {
	query := DB.Model(&InvitationCode{})
	if batchID > 0 {
		query = query.Where("batch_id = ?", batchID)
	}
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		query = query.Where("code LIKE ?", keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err = query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&codes).Error; err != nil {
		return nil, 0, err
	}
	batchIDs := make([]int, 0, len(codes))
	for _, code := range codes {
		batchIDs = append(batchIDs, code.BatchId)
	}
	if len(batchIDs) > 0 {
		var batches []InvitationBatch
		if err = DB.Where("id IN ?", batchIDs).Find(&batches).Error; err != nil {
			return nil, 0, err
		}
		names := make(map[int]string, len(batches))
		for _, batch := range batches {
			names[batch.Id] = batch.Name
		}
		for _, code := range codes {
			code.Name = names[code.BatchId]
		}
	}
	now := common.GetTimestamp()
	for _, code := range codes {
		if code.Status == InvitationStatusEnabled && code.ExpiredTime != 0 && code.ExpiredTime < now {
			code.Status = InvitationStatusDisabled
		}
	}
	return codes, total, nil
}

// CreateInvitationBatch atomically creates a batch and its independent codes.
func CreateInvitationBatch(name string, createdBy, count, maxUses int, expiredTime int64) (*InvitationBatch, []string, error) {
	if count <= 0 || maxUses <= 0 || (expiredTime != 0 && expiredTime < common.GetTimestamp()) {
		return nil, nil, errors.New("invalid invitation batch parameters")
	}
	var batch InvitationBatch
	codes := make([]string, 0, count)
	err := DB.Transaction(func(tx *gorm.DB) error {
		batch = InvitationBatch{Name: name, CreatedBy: createdBy, CreatedTime: common.GetTimestamp(), ExpiredTime: expiredTime, MaxUses: maxUses, Status: InvitationStatusEnabled, CreatedCount: count}
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}
		for i := 0; i < count; i++ {
			var created InvitationCode
			var code string
			for attempt := 0; attempt < 5; attempt++ {
				code = common.GetUUID()
				created = InvitationCode{BatchId: batch.Id, Code: code, Status: InvitationStatusEnabled, CreatedTime: batch.CreatedTime, ExpiredTime: expiredTime, MaxUses: maxUses}
				if err := tx.Create(&created).Error; err == nil {
					break
				} else if !isUniqueConstraintError(err) || attempt == 4 {
					return fmt.Errorf("%w: %v", ErrInvitationCodeGeneration, err)
				}
			}
			codes = append(codes, code)
		}
		return nil
	})
	return &batch, codes, err
}

// ImportInvitationBatch creates one batch from caller-provided codes.
func ImportInvitationBatch(name string, createdBy, maxUses int, expiredTime int64, codes []string) (*InvitationBatch, []string, []InvitationImportSkipped, error) {
	if maxUses <= 0 || (expiredTime != 0 && expiredTime < common.GetTimestamp()) {
		return nil, nil, nil, errors.New("invalid invitation batch parameters")
	}
	valid := make([]string, 0, len(codes))
	skipped := make([]InvitationImportSkipped, 0)
	seen := make(map[string]struct{}, len(codes))
	for line, raw := range codes {
		code := strings.TrimSpace(raw)
		if line >= 100 {
			if code != "" {
				skipped = append(skipped, InvitationImportSkipped{Line: line + 1, Code: code, Reason: "maximum 100 input lines exceeded"})
			}
			continue
		}
		if code == "" {
			skipped = append(skipped, InvitationImportSkipped{Line: line + 1, Reason: "empty code"})
			continue
		}
		if utf8.RuneCountInString(code) > 32 {
			skipped = append(skipped, InvitationImportSkipped{Line: line + 1, Code: code, Reason: "code exceeds 32 characters"})
			continue
		}
		if _, exists := seen[code]; exists {
			skipped = append(skipped, InvitationImportSkipped{Line: line + 1, Code: code, Reason: "duplicate code in import"})
			continue
		}
		seen[code] = struct{}{}
		valid = append(valid, code)
	}
	if len(valid) == 0 {
		return nil, nil, skipped, ErrInvitationImportEmpty
	}
	var batch InvitationBatch
	createdCodes := make([]string, 0, len(valid))
	err := DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		batch = InvitationBatch{Name: name, CreatedBy: createdBy, CreatedTime: now, ExpiredTime: expiredTime, MaxUses: maxUses, Status: InvitationStatusEnabled}
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}
		for _, code := range valid {
			created := InvitationCode{BatchId: batch.Id, Code: code, Status: InvitationStatusEnabled, CreatedTime: now, ExpiredTime: expiredTime, MaxUses: maxUses}
			if err := tx.Create(&created).Error; err != nil {
				if isUniqueConstraintError(err) {
					for line, raw := range codes {
						if line < 100 && strings.TrimSpace(raw) == code {
							skipped = append(skipped, InvitationImportSkipped{Line: line + 1, Code: code, Reason: "code already exists"})
							break
						}
					}
					continue
				}
				return err
			}
			createdCodes = append(createdCodes, code)
		}
		if len(createdCodes) == 0 {
			return ErrInvitationImportEmpty
		}
		batch.CreatedCount = len(createdCodes)
		return tx.Model(&batch).Update("created_count", batch.CreatedCount).Error
	})
	if err != nil {
		return nil, nil, skipped, err
	}
	sort.SliceStable(skipped, func(i, j int) bool { return skipped[i].Line < skipped[j].Line })
	return &batch, createdCodes, skipped, nil
}

func isUniqueConstraintError(err error) bool {
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "unique") || strings.Contains(message, "duplicate")
}

func (batch *InvitationBatch) Update() error {
	return DB.Model(batch).Select("name", "expired_time", "status").Updates(batch).Error
}

func (code *InvitationCode) Update() error {
	if code.UsedCount > 0 {
		return errors.New("used invitation code cannot be edited")
	}
	return DB.Model(code).Select("status", "expired_time").Updates(code).Error
}

func DeleteInvitationCodeById(id int) error {
	var code InvitationCode
	if err := DB.First(&code, "id = ?", id).Error; err != nil {
		return err
	}
	if code.UsedCount > 0 {
		return errors.New("used invitation code cannot be deleted")
	}
	return DB.Delete(&code).Error
}

func DeleteInvitationBatchById(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var batch InvitationBatch
		if err := tx.First(&batch, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Where("batch_id = ?", id).Delete(&InvitationCode{}).Error; err != nil {
			return err
		}
		return tx.Delete(&batch).Error
	})
}

// ConsumeInvitationCode consumes a code in its own transaction.
func ConsumeInvitationCode(code string, userID int) error {
	return DB.Transaction(func(tx *gorm.DB) error { return ConsumeInvitationCodeWithTx(tx, code, userID) })
}

// ConsumeInvitationCodeWithTx joins the caller's transaction, allowing code
// consumption and user creation to commit or roll back as one unit.
func ConsumeInvitationCodeWithTx(tx *gorm.DB, code string, userID int) error {
	code = strings.TrimSpace(code)
	if code == "" {
		return ErrInvitationCodeEmpty
	}
	if userID <= 0 {
		return errors.New("invalid user id")
	}
	var invitation InvitationCode
	if err := lockForUpdate(tx).Where("code = ?", code).First(&invitation).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvitationCodeNotFound
		}
		return err
	}
	if invitation.Status != InvitationStatusEnabled {
		return ErrInvitationCodeDisabled
	}
	if invitation.ExpiredTime != 0 && invitation.ExpiredTime < common.GetTimestamp() {
		return ErrInvitationCodeExpired
	}
	if invitation.UsedCount >= invitation.MaxUses {
		return ErrInvitationCodeExhausted
	}
	var existing InvitationUse
	if err := tx.Where("invitation_code_id = ? AND user_id = ?", invitation.Id, userID).First(&existing).Error; err == nil {
		return ErrInvitationCodeReused
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	now := common.GetTimestamp()
	result := tx.Model(&InvitationCode{}).Where("id = ? AND status = ? AND used_count < ?", invitation.Id, InvitationStatusEnabled, invitation.MaxUses).Updates(map[string]interface{}{"used_count": gorm.Expr("used_count + 1"), "last_used_time": now})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return ErrInvitationCodeExhausted
	}
	return tx.Create(&InvitationUse{InvitationCodeId: invitation.Id, UserId: userID, UsedTime: now}).Error
}
