// Copyright 2014 The Gogs Authors. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package models

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"time"
	log "gopkg.in/clog.v1"
	"github.com/go-xorm/xorm"
	"github.com/gogs/gogs/pkg/tool"
)

// AccessToken represents a personal access token.
type AccessToken struct {
	ID   int64
	UID  int64 `xorm:"INDEX" 'u_i_d'`
	Name string `xorm:"INDEX" 'name'`
	Sha1 string `xorm:"UNIQUE VARCHAR(40)"`

	Created           time.Time `xorm:"created" json:"-"`
	CreatedUnix       int64 `xorm:"created" json:"-"`
	Updated           time.Time `xorm:"-" json:"-"` // Note: Updated must below Created for AfterSet.
	UpdatedUnix       int64 `xorm:"updated" json:"-"`
	HasRecentActivity bool `xorm:"-" json:"-"`
	HasUsed           bool `xorm:"-" json:"-"`
}

func (t *AccessToken) BeforeInsert() {
	t.CreatedUnix = time.Now().Unix()
}

func (t *AccessToken) BeforeUpdate() {
	t.UpdatedUnix = time.Now().Unix()
}

func (t *AccessToken) AfterSet(colName string, _ xorm.Cell) {
	switch colName {
	case "created_unix":
		t.Created = time.Unix(t.CreatedUnix, 0).Local()
	case "updated_unix":
		t.Updated = time.Unix(t.UpdatedUnix, 0).Local()
		t.HasUsed = t.Updated.After(t.Created)
		t.HasRecentActivity = t.Updated.Add(7 * 24 * time.Hour).After(time.Now())
	}
}

// NewAccessToken creates new access token.
func NewAccessToken(t *AccessToken) error {
	t.Sha1 = tool.SHA1("")
	_, err := x.Insert(t)
	return err
}


func GenerateAccessToken(user User) (AccessToken, error){
	idString := string(user.ID)
	sha1 := tool.SHA1(idString)
	token := AccessToken{Sha1: sha1, Name: user.Name, UID: user.ID, HasUsed: false}
	if _, e := x.InsertOne(token); e != nil {
		return AccessToken{}, e
	}
	return token, nil
}

// GetAccessTokenBySHA returns access token by given sha1.
func GetAccessTokenBySHA(sha string) (*AccessToken, error) {
	if sha == "" {
		return nil, ErrAccessTokenEmpty{}
	}
	t := &AccessToken{Sha1: sha}
	has, err := x.Get(t)
	if err != nil {
		return nil, err
	} else if !has {
		return nil, ErrAccessTokenNotExist{sha}
	}
	return t, nil
}


func GetAccessToken(c *gin.Context) (*AccessToken) {
	token := c.GetHeader("Access-Token")
	accessToken, e := GetAccessTokenBySHA(token)
	if  e == nil {
		log.Info("access token of :" + accessToken.Name)
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
	}
	return accessToken
}

// ListAccessTokens returns a list of access tokens belongs to given user.
func ListAccessTokens(uid int64) ([]*AccessToken, error) {
	tokens := make([]*AccessToken, 0, 5)
	return tokens, x.Where("uid=?", uid).Desc("id").Find(&tokens)
}

// UpdateAccessToken updates information of access token.
func UpdateAccessToken(t *AccessToken) error {
	_, err := x.Id(t.ID).AllCols().Update(t)
	return err
}

// DeleteAccessTokenOfUserByID deletes access token by given ID.
func DeleteAccessTokenOfUserByID(userID, id int64) error {
	_, err := x.Delete(&AccessToken{
		ID:  id,
		UID: userID,
	})
	return err
}
