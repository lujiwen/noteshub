package main

import (
	"../models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/contrib/sessions"
	"github.com/gin-gonic/gin"
	"time"
)


func main() {
	// Set the router as the default one shipped with Gin
	router := gin.Default()

	store := sessions.NewCookieStore([]byte("secret"))
	router.Use(sessions.Sessions("mysession", store))

	// solve 403 forbid post request problem
	config := cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type, Access-Token"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
		//AllowOrigins:     []string{"http://localhost:3000"} ,
		AllowOrigins:     []string{"*"},
	})
	router.Use(config)

	// same as
	//router.Use(cors.Default())

	// connect to db
	//models.InitializeDB()

	// Serve frontend static files

	// Setup route group for the API

	healthCheckApi := router.Group("")
	{
		healthCheckApi.GET("/ping", models.PingService)
		healthCheckApi.POST("/pong", models.TestPostFunction)
	}

	sheetApi := router.Group("")
	{
		sheet := models.MusicSheet{}
		sheetApi.GET("/sheet/:sheetId", sheet.GetSheet)
		sheetApi.GET("/sheets", sheet.GetUploadSheetsByUser)
		sheetApi.POST("/upload", sheet.Upload)
		sheetApi.POST("/uploadSheetAndInfo", sheet.UploadSheetAndInfo)
	}


	userApi := router.Group("")
	{
		user := models.User{}
		userApi.POST("/register" , user.Register)
		userApi.POST("/login", user.Login)
	}

	// Start and run the server
	router.Run(":8080")
}

