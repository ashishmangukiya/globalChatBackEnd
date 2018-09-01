
const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const logger = require('./loggerLib.js');
const events = require('events');
const eventEmitter = new events.EventEmitter();

const tokenLib = require("./tokenLib.js");
const check = require("./checkLib.js");
const response = require('./responseLib')
const ChatModel = mongoose.model('Chat');
const ChatRoomModel = mongoose.model('ChatRoom');

const time = require('./timeLib');

const redisLib = require("./redisLib.js");

const emailLib = require('../libs/emailLib');


let setServer = (server) => {

    let io = socketio.listen(server);

    let myIo = io.of('/')

    myIo.on('connection', (socket) => {

        console.log("verify user");

        socket.emit("verifyUser", "");


        socket.on('set-new-user', (authToken) => {

            tokenLib.verifyClaimWithoutSecret(authToken, (err, user) => {
                if (err) {
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                }
                else {

                    console.log("user is verified");
                    let currentUser = user.data;
                    socket.userId = currentUser.userId
                    let fullName = `${currentUser.firstName} ${currentUser.lastName}`
                    let key = currentUser.userId
                    let value = fullName

                    let setUserOnline = redisLib.setANewOnlineUserInHash("onlineUsersList", key, value, (err, result) => {
                        if (err) {
                            console.log(`some error occurred`)
                        } else {
                            redisLib.getAllUsersInAHash('onlineUsersList', (err, result) => {
                                if (err) {
                                    console.log(err)
                                } else {

                                    console.log(`${fullName} is online`);
                                    socket.room = 'GlobalChat'
                                    socket.join(socket.room) 
                                    eventEmitter.emit('checking-user-default', currentUser); 
                                    socket.to(socket.room).broadcast.emit('online-user-list', result);

                                }
                            })
                        }
                    })
                   
                }
            })

        })

        socket.on('disconnect', () => {
          
            console.log("user is disconnected");
            console.log(socket.userId);


           
            if (socket.userId) {
                redisLib.deleteUserFromHash('onlineUsersList', socket.userId)
                redisLib.getAllUsersInAHash('onlineUsersList', (err, result) => {
                    if (err) {
                        console.log(err)
                    } else {
                      socket.broadcast.emit('online-user-list', result);

                    }
                })
            }

        }) // end of on disconnect

        socket.on('creating-chat-room', (chatRoomDetails) => {
            let globalChatRoom = 'softChat'
            chatRoomDetails.chatRoomId = shortid.generate();

            socket.room = chatRoomDetails.chatRoomId
            // joining chat-group room.
            socket.join(globalChatRoom)
            socket.join(socket.room)

            setTimeout(function () {
                eventEmitter.emit('create-save-ChatRoom', chatRoomDetails)
            }, 500)

            socket.to(globalChatRoom).broadcast.emit('created-chatroom', chatRoomDetails);
            console.log(`Chat Room Created by ${chatRoomDetails.userName}`)

        });// end on create chat room


        socket.on('joining-chat-room', (chatRoomDetails) => {
            socket.room = chatRoomDetails.chatRoomId
            // joining chat-group room.
            socket.join(socket.room)

            setTimeout(function () {
                eventEmitter.emit('join-save-ChatRoom', chatRoomDetails)
            }, 500)

            socket.to(socket.room).broadcast.emit('joined-chatroom', chatRoomDetails);
            console.log(`Chat Room joined by ${chatRoomDetails.userName}`)

        });// end on join chat room

        socket.on('leaving-chat-room', (chatRoomDetails) => {
            socket.room = chatRoomDetails.chatRoomId
            // leaving chat-group room.
            //console.log(chatRoomDetails)
            socket.to(socket.room).broadcast.emit('leaved-chatroom', chatRoomDetails);
            console.log(`Chat Room leaved by ${chatRoomDetails.userName}`)

            setTimeout(function () {
                eventEmitter.emit('leave-save-ChatRoom', chatRoomDetails)
            }, 500)

            setTimeout(function () {
                socket.leave(socket.room)
            }, 2000)


        });// end on leave chat room


        socket.on('deleting-chat-room', (chatRoomDetails) => {
            socket.room = chatRoomDetails.chatRoomId

          
            setTimeout(function () {
                let findQuery = {
                    $and: [
                        { userId: chatRoomDetails.userId },
                        { chatRoomId: chatRoomDetails.chatRoomId }
                    ]
                }
                console.log(findQuery)
                ChatRoomModel.findOneAndRemove(findQuery).exec((err, result) => {
                    if (err) {
                        console.log(err)
                     chatRoomDetails.response = err;
                        socket.to(socket.room).emit('deleted-chatroom', chatRoomDetails);

                    } else if (check.isEmpty(result)) {
                      
                        chatRoomDetails.response = `${chatRoomDetails.userName} failed to delete the Chat Room { ${chatRoomDetails.chatRoomTitle} }. User not an Admin '`;
                        socket.to(socket.room).emit('deleted-chatroom', chatRoomDetails);

                    } else {
                        chatRoomDetails.response = `${chatRoomDetails.userName} deleted the room { ${chatRoomDetails.chatRoomTitle} } successfully'`;
                        socket.to(socket.room).emit('deleted-chatroom', chatRoomDetails);

                    }
                });// end ChatRoomModel model find and remove
            }, 500)

            setTimeout(function () {
                socket.leave(socket.room)
            }, 2000)


        });// end on leave chat room

        socket.on('sharing-chat-room', (chatRoomDetails) => {

            let sendEmailOptions = {
                email: chatRoomDetails.emailId,
                subject: `Invite Link to Join "${chatRoomDetails.chatRoomTitle}" `,
                html: `<b> ${chatRoomDetails.emailId}</b> 
                <br> Hope you are doing well. 
                <br> ${chatRoomDetails.senderName} has invited you to join group <b>"${chatRoomDetails.chatRoomTitle}"</b> via Global Chat                         
                
                <br> Please be sure to login or register yourself to global Chat before joining group.<a class="dropdown-item" href="${chatRoomDetails.baseUrlApplication}/signup">Register Here</a> 

                <br>Please find the Invite Link : <a class="dropdown-item" href="${chatRoomDetails.chatRoomLink}">Click Here</a> .

                                        
                <b>Global Chat <br>
                Ashish Mangukiya </b>
                `
            }

            emailLib.sendEmail(sendEmailOptions);

        });// end on share chat room

        socket.on('chat-msg', (data) => {
            console.log("socket chat-msg called")
            //console.log(data);
            data['chatId'] = shortid.generate()
            //console.log(data);
            // event to save chat.
            setTimeout(function () {
                eventEmitter.emit('save-chat', data);
            }, 1000)
            console.log(`chat room : ${data.chatRoom}`)

            socket.broadcast.emit('get-chat', data);
            //myIo.emit('get-chat', data)

        });



        eventEmitter.on('join-default-room', (retrievedRoomDetails) => {
            //console.log('Connected to all Sockets Room')
            for (let x in retrievedRoomDetails) {
                let socketRoomFound = retrievedRoomDetails[x].chatRoomId
                //console.log(retrievedRoomDetails[x].chatRoomId)
                //socket.join(socketRoom)
                //console.log(socketRoomFound)
                socket.join(socketRoomFound)
            }


        }); // end of connecting all sockets .


        socket.on('typing', (fullName) => {
            socket.to(socket.room).broadcast.emit('typing', fullName);
        });

    });
}


// database operations are kept outside of socket.io code.

eventEmitter.on('checking-user-default', (currentUser) => {
    ChatRoomModel.find({ 'activeUsers.id': currentUser.userId })
        .exec((err, retrievedRoomDetails) => {

            if (err) {
                console.log(err)

            } else if (check.isEmpty(retrievedRoomDetails)) {
                console.log('No Room Found to create Socket')

            } else {
                console.log(`${currentUser.firstName} Connecting all sockets`)
                eventEmitter.emit('join-default-room', retrievedRoomDetails); //create and join all sockets 

            }
        })
}); // end of connecting all sockets .



// saving chats to database.
eventEmitter.on('save-chat', (data) => {

    // let today = Date.now();

    let newChat = new ChatModel({

        chatId: data.chatId,
        senderName: data.senderName,
        senderId: data.senderId,
        receiverName: data.receiverName || '',
        receiverId: data.receiverId || '',
        message: data.message,
        chatRoom: data.chatRoom || '',
        chatRoomTitle: data.chatRoomTitle,
        createdOn: data.createdOn

    });

    newChat.save((err, result) => {
        if (err) {
            console.log(`error occurred: ${err}`);
        }
        else if (result == undefined || result == null || result == "") {
            console.log("Chat Is Not Saved.");
        }
        else {
            console.log("Chat Saved.");
            console.log(result);
        }
    });

}); // end of saving chat.


eventEmitter.on('create-save-ChatRoom', (chatRoomDetails) => {

    ChatRoomModel.findOne({ chatRoomId: chatRoomDetails.chatRoomId })
        .exec((err, retrievedRoomDetails) => {
            if (err) {
                console.log(err)

            } else if (check.isEmpty(retrievedRoomDetails)) {
                //console.log(chatRoomDetails)
                let newRoom = new ChatRoomModel({
                    chatRoomId: chatRoomDetails.chatRoomId,
                    chatRoomTitle: chatRoomDetails.chatRoomTitle,
                    userName: chatRoomDetails.userName,
                    userId: chatRoomDetails.userId,
                    activeUsers: [{
                        id: chatRoomDetails.userId,
                        user: chatRoomDetails.userName
                    }],
                    createdOn: time.now()
                })
                newRoom.chatRoomLink = `${chatRoomDetails.chatRoomLink}/chatroom/join/${newRoom.chatRoomId}`;

                newRoom.save((err, newRoomCreated) => {
                    if (err) {
                        console.log('Failed to create new Room')
                        console.log(err)

                    } else {
                        newRoomObj = newRoomCreated.toObject();

                        console.log('Chat Room Created at server');
                        //console.log(newRoomObj);

                    }
                })
            } else {
                console.log('Room Cannot Be Created.Room Already Present with given Title')
            }
        })
});

eventEmitter.on('join-save-ChatRoom', (chatRoomDetails) => {
    //testing 
    //db.users.find({awards: {$elemMatch: {award:'National Medal', year:1975}}})

    ChatRoomModel.find({ "activeUsers.id": { $ne: chatRoomDetails.userId } })
        .exec((err, retrievedRoomDetails) => {
            if (err) {
                console.log(err)

            } else if (check.isEmpty(retrievedRoomDetails)) {
                console.log('User Already joined the Chat Room')

            } else {
                //console.log(chatRoomDetails)
                ChatRoomModel.update({ 'chatRoomId': chatRoomDetails.chatRoomId }, { $push: { activeUsers: { id: chatRoomDetails.userId, user: chatRoomDetails.userName } } }).exec((err, result) => {
                    if (err) {
                        console.log(err)
                        console.log('Failed To Join the Chat Room ')
                    } else if (check.isEmpty(result)) {
                        console.log('No Chat Room Found ')
                    } else {
                        console.log('User added to Chat Room')
                        console.log(result)
                    }
                });// end ChatRoomModel update

            }
        })
});


eventEmitter.on('leave-save-ChatRoom', (chatRoomDetails) => {
    //testing 
    ChatRoomModel.findOne({ activeUsers: { $elemMatch: { id: chatRoomDetails.userId } } })
        .exec((err, retrievedRoomDetails) => {
            if (err) {
                console.log(err)

            } else if (check.isEmpty(retrievedRoomDetails)) {

                console.log(chatRoomDetails)
                console.log('User Not in the Chat Room')


            } else {
                console.log(chatRoomDetails)

                ChatRoomModel.update({ 'chatRoomId': chatRoomDetails.chatRoomId }, { $pull: { activeUsers: { id: chatRoomDetails.userId, user: chatRoomDetails.userName } } }).exec((err, result) => {
                    if (err) {
                        console.log(err)
                        console.log('Failed To leave the Chat Room ')
                    } else if (check.isEmpty(result)) {
                        console.log('No Chat Room Found ')
                    } else {
                        console.log('User leaved from Chat Room')
                    }
                });// end ChatRoomModel update
            }
        })
});


///redis code 

module.exports = {
    setServer: setServer
}
