package model

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

type InvitationCode struct {
	Id           int            `json:"id"`
	Code         string         `json:"code" gorm:"type:char(32);uniqueIndex"`
	Status       int            `json:"status" gorm:"default:1;index"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint"`
	ExpiredTime  int64          `json:"expired_time" gorm:"bigint;index"`
	MaxUses      int            `json:"max_uses"`
	UsedCount    int            `json:"used_count"`
	LastUsedTime int64          `json:"last_used_time" gorm:"bigint"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type InvitationUse struct {
	Id               int   `json:"id"`
	InvitationCodeId int   `json:"invitation_code_id" gorm:"uniqueIndex:uk_invitation_code_user,priority:1;index"`
	UserId           int   `json:"user_id" gorm:"uniqueIndex:uk_invitation_code_user,priority:2;index"`
	UsedTime         int64 `json:"used_time" gorm:"bigint;index"`
}

func GetInvitationCodeById(id int) (*InvitationCode, error) {
	if id <= 0 {
		return nil, gorm.ErrRecordNotFound
	}
	code := &InvitationCode{}
	return code, DB.First(code, "id = ?", id).Error
}

func SearchInvitationCodes(keyword, status string, startIdx, num int) (codes []*InvitationCode, total int64, err error) {
	query := DB.Model(&InvitationCode{})
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
	now := common.GetTimestamp()
	for _, code := range codes {
		if code.Status == InvitationStatusEnabled && code.ExpiredTime != 0 && code.ExpiredTime < now {
			code.Status = InvitationStatusDisabled
		}
	}
	return codes, total, nil
}

func CreateInvitationCodes(count, maxUses int, expiredTime int64) ([]string, error) {
	if count <= 0 || maxUses <= 0 || (expiredTime != 0 && expiredTime < common.GetTimestamp()) {
		return nil, errors.New("invalid invitation parameters")
	}
	codes := make([]string, 0, count)
	err := DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		for i := 0; i < count; i++ {
			var code string
			for attempt := 0; attempt < 5; attempt++ {
				code = common.GetUUID()
				created := InvitationCode{Code: code, Status: InvitationStatusEnabled, CreatedTime: now, ExpiredTime: expiredTime, MaxUses: maxUses}
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
	return codes, err
}

func ImportInvitationCodes(maxUses int, expiredTime int64, codes []string) ([]string, int, []InvitationImportSkipped, error) {
	if maxUses <= 0 || (expiredTime != 0 && expiredTime < common.GetTimestamp()) {
		return nil, 0, nil, errors.New("invalid invitation parameters")
	}
	valid := make([]string, 0, len(codes))
	skipped := make([]InvitationImportSkipped, 0)
	seen := make(map[string]struct{}, len(codes))
	deduplicated := 0
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
		if _, ok := seen[code]; ok {
			deduplicated++
			continue
		}
		seen[code] = struct{}{}
		valid = append(valid, code)
	}
	if len(valid) == 0 {
		if deduplicated > 0 {
			return nil, deduplicated, skipped, nil
		}
		return nil, 0, skipped, ErrInvitationImportEmpty
	}
	createdCodes := make([]string, 0, len(valid))
	err := DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		for _, code := range valid {
			created := InvitationCode{Code: code, Status: InvitationStatusEnabled, CreatedTime: now, ExpiredTime: expiredTime, MaxUses: maxUses}
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&created)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				deduplicated++
				continue
			}
			createdCodes = append(createdCodes, code)
		}
		return nil
	})
	if err != nil {
		return nil, deduplicated, skipped, err
	}
	sort.SliceStable(skipped, func(i, j int) bool { return skipped[i].Line < skipped[j].Line })
	return createdCodes, deduplicated, skipped, nil
}

func isUniqueConstraintError(err error) bool {
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "unique") || strings.Contains(message, "duplicate")
}

func (code *InvitationCode) Update() error {
	if code.UsedCount > 0 {
		return errors.New("used invitation code cannot be edited")
	}
	return DB.Model(code).Select("code", "status", "expired_time", "max_uses").Updates(code).Error
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
