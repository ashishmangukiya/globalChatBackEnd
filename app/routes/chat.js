const express = require('express');
const router = express.Router();
const chatController = require("./../../app/controllers/chatController");
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')
  
module.exports.setRouter = (app) => {

  let baseUrl = `${appConfig.apiVersion}/chat`;

  app.get(`${baseUrl}/get/for/group`, auth.isAuthorized, chatController.getGroupChat);
  /** 
   * @apiGroup chat
   * @apiVersion  1.0.0
   * @api {get} /api/v1/chat/get/for/group to get paginated chats of Group.
   * 
   * @apiParam {string} chatRoom Chat Room Id . (query params) (required)
   * @apiParam {number} skip skip value for pagination. (query params) (optional)
   *
   * @apiSuccess {object} myResponse shows error status, message, http status code, result.
   * 
   * @apiSuccessExample {object} Success-Response:
       {
    "error": false,
    "message": "All Group Chats Listed",
    "status": 200,
    "data": [
        {
            "chatId": "Bd2ouxGQ-",
            "modifiedOn": "2018-09-01T11:54:56.634Z",
            "createdOn": "2018-09-01T11:54:55.631Z",
            "seen": false,
            "chatRoomTitle": "room3",
            "chatRoom": "OvUoyBGRm",
            "message": "\nnice to meet tou ",
            "senderId": "D63HTYXDf",
            "senderName": "ashish mangukiya"
        },
        {
            "chatId": "PbUaHVA7aH",
            "modifiedOn": "2018-09-01T11:54:56.933Z",
            "createdOn": "2018-09-01T11:54:55.931Z",
            "seen": false,
            "chatRoomTitle": "room3",
            "chatRoom": "OvUoyBGRm",
            "message": "\n",
            "senderId": "D63HTYXDf",
            "senderName": "ashish mangukiya"
        },
        {
            "chatId": "SOIQP7-jn",
            "modifiedOn": "2018-09-01T11:55:15.289Z",
            "createdOn": "2018-09-01T11:55:14.286Z",
            "seen": false,
            "chatRoomTitle": "room3",
            "chatRoom": "OvUoyBGRm",
            "message": "hello boyzzzz\n",
            "senderId": "D63HTYXDf",
            "senderName": "ashish mangukiya"
        }
    ]
}
      @apiErrorExample {json} Error-Response:
          {
          "error": true,
          "message": "No Chat Found",
          "status": 404,
          "data": null
          }

        }
 */

  
 


 
}
