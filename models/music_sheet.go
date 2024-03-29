package models

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-xorm/xorm"
	log "gopkg.in/clog.v1"
	"io/ioutil"
	"net/http"
	"noteshub/models/musicxml"
	"strconv"
	"time"
)



type SheetType int

const (
	_ SheetType  = iota
	Stave
	GuitarTablature
	ukeleleSpectrum
)


type SheetFile struct {
	SheetTp SheetType
	FilePath string
	Filename string
	UploadTime time.Time
	Uploader string
}


// every field name should start with letter in upper case, otherwise it is not visible for class outside
type MusicSheet struct {
	ID               int64  // only set ID with type "int64", then it can be a primary key
	Location         string `xorm:"UNIQUE NOT NULL" json:"location"  `
	UserId           int64 `xorm:"UNIQUE NOT NULL" json:"userId"  `
	CreateTime       time.Time `xorm:"UNIQUE NOT NULL" json:"createTime"  `
	LastModifiedTime time.Time `json:"lastModifiedTime"  `
	SheetType        SheetType `json:"sheetType" binding:"required"`
	Filename         string  `xorm:"UNIQUE NOT NULL" json:"filename"  `
	Liked            int      `json:"liked"`
	ThumbUp          int      `json:"thumbUp"`
	ThumbDown        int      `json:"thumbDown"`
	Title            string   `json:"title"`   // 歌曲名
	Lyricist         string `json:"lyricist"`  // 作词人
	Composer         string `json:"composer"`  // 作曲人
	Arranger         string `json:"arranger"`  // 编曲人
	Scorer           string `json:"scorer"`    // 记谱人
}

func (MusicSheet)UploadSheetAndInfo(c *gin.Context) {
	accessToken := GetAccessToken(c)

	var sheetFile MusicSheet
	if err := c.ShouldBindJSON(&sheetFile); err == nil {
		log.Info("receive")
		//save to db upload
		parsedFileLocation := sheetFile.Location
		sheetFile := MusicSheet{SheetType: Stave, Location: parsedFileLocation, Filename: sheetFile.Filename, CreateTime: time.Now(), UserId: accessToken.UID }
		if  err := sheetFile.SaveSheet(x); err != nil{
			c.JSON(http.StatusInternalServerError, fmt.Sprintf("'%s' can not be saved to databse! %s", sheetFile.Filename, err.Error()))

		} else {
			c.JSON(http.StatusOK, fmt.Sprintf("'%s' uploaded successfully!", sheetFile.Filename))
		}
	} else {
		c.JSON(http.StatusInternalServerError, fmt.Sprintf("'%s' can not be saved to databse! %s", sheetFile.Filename, err.Error()))
	}
}

func (sheet *MusicSheet)SaveSheet(engine *xorm.Engine) (error) {
	 if _,err := engine.InsertOne(sheet);  err != nil {
	 	return err
	 } else {
	 	return nil
	 }
}

func (MusicSheet)Upload(c *gin.Context) {
	accessToken := GetAccessToken(c)
	// single file
	file, _ := c.FormFile("file")
	log.Info(file.Filename)
	filename := file.Filename
	size := file.Size
	log.Info("filename : %s , size :%s " , filename, size)
	//validate file name, format and maybe file content size
	if fileContent, err := file.Open(); err == nil {
		//no side effect
		musicXml, _ := ioutil.ReadAll(fileContent) // why the long names though?
		stave := models.ParseMxmlFromDataByte(musicXml)
		fmt.Printf(stave.Composer)
		fmt.Printf("size:%d", len(musicXml))
	}

	//defer file.close()


	// todo: add transaction to ensure save to dir and db succeed or failed together
	//save to db upload
	destinationDir := "/Users/lujiwen/noteshub/upload_files"
	sheetFile := MusicSheet{SheetType: Stave, Location: destinationDir + "/" + file.Filename, Filename: filename, CreateTime: time.Now(), UserId: accessToken.UID}
	if  _, err := x.InsertOne(sheetFile); err != nil{
		c.JSON(http.StatusInternalServerError, fmt.Sprintf("'%s' can not be saved to databse!", file.Filename))

	} else {
		c.JSON(http.StatusOK, fmt.Sprintf("'%s' uploaded successfully!", file.Filename))
	}


	//Upload the file to specific dst.
	if err := c.SaveUploadedFile(file, destinationDir  + "/" + file.Filename ); err != nil {
		c.JSON(http.StatusInternalServerError, fmt.Sprintf("'%s' can not be saved into a specific directory '%s' ! " + err.Error(), file.Filename, destinationDir))
		return
	}
}

func (MusicSheet)GetSheet(c *gin.Context) {
	c.Header("Content-Type", "application/json; charset=UTF-8")
	c.Header("Access-Control-Allow-Origin", "*")

	GetAccessToken(c)

	if sheetId, err := strconv.Atoi(c.Param("sheetId")); err == nil {
		log.Info("get sheet by id : %s", &sheetId)
		sheet,_ := GetSheetById(sheetId)
		c.JSON(http.StatusOK, ParseMxmlFromString(sheet.Location))
		//c.JSON(http.StatusOK, ParseMxmlFromString("resources/sample-chord.xml"))
	} else {
		c.AbortWithStatus(http.StatusNotFound)
	}
}
func GetSheetById(sheetId int)  (MusicSheet, error) {
	var sheet MusicSheet
	_, err := x.Table("music_sheet").Where("i_d = ?", sheetId).Get(&sheet)
	return sheet ,err
}

func (MusicSheet)GetUploadSheetsByUser(c *gin.Context) {
	accessToken := GetAccessToken(c)
	userId := accessToken.UID
	//sheet := &MusicSheet{UserId: userId}
	if sheets, e := GetSheetByUserId(userId); e == nil {
		c.JSON(http.StatusOK, sheets)
	} else {
		c.AbortWithStatus(http.StatusNotFound)
	}

}

func GetSheetByUserId(userId int64) ([]MusicSheet, error) {
	sheets := make([]MusicSheet, 0)
	err := x.Where("user_id = ?", userId).Limit(10, 0).Find(&sheets)
	return sheets,err
}
