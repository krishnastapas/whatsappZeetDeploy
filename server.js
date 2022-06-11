// importing
import express, { json, Router } from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser"
import cookieParser from "cookie-parser";
import session from "express-session"
import Users from "./database/databaseSchema/UsersSchema.js";
import chat from "./database/databaseSchema/chatSchema.js";
import axios from "axios";
import Pusher from "pusher";
import cors from "cors";
import { default as connectMongoDBSession } from 'connect-mongodb-session';
import { googleAuth } from "./googleAuth.js"
import { newChat } from "./database/database_funtions/createChatUsers.js"

import { nanoid } from 'nanoid'
import { newChat_chat } from "./database/database_funtions/createChat.js";
import { newMessage } from "./database/database_funtions/createMessage.js";
//app config
const app = express()
const port = process.env.PORT || 9000
const hostname='0.0.0.0';


const pusher = new Pusher({
    appId: "1412364",
    key: "0403674da6773397d012",
    secret: "bafe53950f8280a71fa3",
    cluster: "ap2",
    useTLS: true
});


//database config
const MongoDBStore = connectMongoDBSession(session);
var store = new MongoDBStore({
    uri: 'mongodb+srv://admin:admin@cluster0.w9ipn.mongodb.net/?retryWrites=true&w=majority',
    collection: 'mySessions'
});

// Catch errors
store.on('error', function (error) {
    console.log(error);
});


//middleware
app.use(express.static('public'))

app.use(express.json())
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["POST", "PUT", "GET", "OPTION", "HEAD"],
    credentials: true,
})
);
var oneDay = 24 * 60 * 60 * 1000;
app.use(cookieParser("lkfng34oiptpwhhriodv0934oidfvoib3beiosfd"))

// app.use(Router);
app.use(session({
    name: "user_Session",
    secret: "lkfng34oiptpwhhriodv0934oidfvoib3beiosfd",
    store: store,
    saveUninitialized: false,
    resave: true,
    cookie: {
        maxAge: oneDay,
        // httpOnly: true,
        // sameSite:"none"


    },
})
);




// db config
const connection_url = 'mongodb+srv://admin:admin@cluster0.w9ipn.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(connection_url, {
    // useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,

})



const db = mongoose.connection;
db.once("open", () => {
    console.log("Db connected")

    // users update
    const usersCollection = db.collection("users");
    const changeStream1 = usersCollection.watch();
    changeStream1.on('change', (change) => {
        // console.log(change)
        if (change.operationType === 'update') {
            const usersDetails = change.updateDescription;
            pusher.trigger('users', 'updated',
                {
                    "updated": true
                }
            );
        } else {
            console.log('Error trigering Pusher')
        }
    })


    const chatsCollection = db.collection("chats");
    const changeStream2 = chatsCollection.watch();
    changeStream2.on('change', (change) => {
        console.log(change)
        if (change.operationType === 'update') {
            // const usersDetails = change.updateDescription;
            pusher.trigger('chats', 'updated',
                {
                    "updated": true
                }
            );
        } else {
            console.log('Error trigering Pusher')
        }
    })
});


//???


// api routes
// app.get('/', (req, res) => res.status(200).send('hello world'))



// user sync
app.get('/api/v1/users/sync', async (req, res) => {
    // console.log(req.sessionID)
    // console.log(req.session.user)
    let user = req.session.user
    if (req.session.user) {
        let found_user = await Users.findOne({
            "name": user.name,
            "email": user.email
        })
        // console.log(found_user)
        return res.status(200).send(found_user);
    }
    else {
        return res.status(401).send("session expired")
    }

})

// message sync
app.post('/api/v1/chat/messages/sync', async (req, res) => {
    if (req.session.user) {
    // console.log(req.body.chatId)
    const found_chat = await chat.findOne({
        "chatId": req.body.chatId
    })
    // console.log(found_chat)
    res.status(200).send(found_chat);
    }
    else {
        return res.status(401).send("session expired")
    }


})


// login api
app.post('/api/v1/users/login', async (req, res) => {
    // req.body
    //  {
    // idToken:
    // email:
    // name:
    //photoURL:
    // }
    const req_data = req.body

    //gogle authentication
    var google_res = await googleAuth(req_data.idToken);
    // console.log(google_res.data)
    // console.log(google_res.data.users[0].email);
    // console.log(google_res.data.users[0].displayName);
    let res_email = google_res.data.users[0].email;
    let res_name = google_res.data.users[0].displayName;
    let res_photoURL = google_res.data.users[0].photoUrl;
    if (req_data.name == res_name &&
        req_data.email == res_email) {

        //sucessful  create user in session

        req.session.user = {
            "name": res_name,
            "email": res_email,
            "photoURL": res_photoURL,
        }

        //checking user exit from before
        let found_user = await Users.findOne({
            "name": res_name,
            "email": res_email
        })
        const u = {
            "name": res_name,
            "email": res_email,
            "photoURL": res_photoURL
        }
        if (found_user) {
            //user exit
            // console.log("user found")
            // console.log(found_user)
            return res.status(200).send(found_user)
        }
        else {
            //user do not exit so insert user in database
            found_user = await Users.insertMany(u)
            // console.log("new user Created")
            // console.log(found_user[0])
            return res.status(201).send(found_user[0])

        }
    }
    else {
        return res.status(500).send("user not valid")
    }


})

//sign out api
app.post('/api/v1/users/logout', async (req, res) => {
    req.session.user = null
    req.session.save(function (err) {
        if (err) next(err)

        // regenerate the session, which is good practice to help
        // guard against forms of session fixation
        req.session.regenerate(function (err) {
            if (err) next(err)
            return res.send("user got sign out")
        })
    })
})



// to create new chat
app.post('/api/v1/users/chats/new', async (req, res) => {

    // req.body
    // {
    // "req_name":
    // "req_email":
    //          "name":
    //          "email":
    // }
    const receiver_data = req.body;
    if (req.session.user) {
        const sender_data = req.session.user;
        // const req_name=req_data.req_name;
        // const req_email=req_data.req_email;
        //    console.log("name:")
        //    console.log(req_name)
        //    console.log(req_data.name)
        //    console.log("Email:")
        //    console.log(req_email)
        //    console.log(req_data.email)




        // checking chat is already there or not 

        const found_user = await Users.findOne({ "email": sender_data.email }, { chats: { $elemMatch: { email: receiver_data.email } } })

        // console.log("found_user")
        // console.log(found_user.chats[0])


        if (found_user.chats[0]) {
            //  console.log("chat already exit")
            // making show true
            const result = await Users.updateOne({
                email: sender_data.email,
                chats: { $elemMatch: { email: receiver_data.email } }
            },
                { $set: { "chats.$.show": true } })
            //  console.log("result............")  
            //  console.log(result)   
            return res.status(200).send({ "name": found_user.chats[0].name })
        }
        else {
            //  console.log("chat do not exit")

            //check users exit with the requested email id or not 
            let found_user = await Users.findOne({
                "email": receiver_data.email
            })
            console.log("found user........")
            console.log(found_user)
            //  if present create chat for both user
            if (found_user) {
                //  console.log("found user")
                let chatId = nanoid();
                // creating chat  in receiver data
                const result1 = await newChat(receiver_data.email, sender_data.email, sender_data.name, sender_data.photoURL, chatId);
                // creating chat in sender data 
                const result2 = await newChat(sender_data.email, receiver_data.email, receiver_data.name, found_user.photoURL, chatId);
                //  console.log(result2);
                //  console.log(result1);
                const result3 = await newChat_chat(chatId);

                return res.status(201).send("user found and chat created ")

            }
            else {
                return res.status(400).send("user Not found")


            }


        }

    }
    else {

        return res.status(400).send("session Expired")
    }
})

// to remove chat from sidebar
app.post('/api/v1/users/chats/remove', async (req, res) => {
    if (req.session.user) {
        const result = await Users.updateOne({
            email: req.session.user.email,
            chats: { $elemMatch: { email: req.body.email } }
        },
            { $set: { "chats.$.show": false } })
    }
    else {
        return res.status(400).send("session Expired")
    }

})

// to delete chat from chats and make active false in chat collection
app.post('/api/v1/users/chats/delete', async (req, res) => {
    if (req.session.user) {
        // deleting from users/chats
        const result1 = await Users.updateOne({
            email: req.session.user.email
        },
            { $pull: { chats: { email: req.body.email } } })

        // changing active to false from chat/active
        console.log("Chat id......")
        console.log(req.body.chatId)
        const result2 = await chat.updateOne({
            "chatId": req.body.chatId
        }, {
            "active": false
        })
        console.log("result2...........")
        console.log(result2)
    }
    else {
        return res.status(400).send("session Expired")
    }
})


// to create new message 
app.post('/api/v1/chat/messages/new', async (req, res) => {

    // req.body {
    //     "chatId"
    //     "name":
    //     "message":
    //     "time":
    // }

    if (req.session.user) {

        const result = await newMessage(req.body.chatId, req.session.user.email, req.session.user.name, req.body.message, req.body.time);
        // console.log("result....")
        // console.log(result)
        if (result.modifiedCount) {

            return res.status(201).send("message inserted")
        }
        else {
            return res.send(401).send("chat does not exit")
        }
        // const result = await chat.updateOne({
        //     email: req.session.user.email,
        //     chats: { $elemMatch: { email: req.body.email } }
        // },
        //     { $set: { "chats.$.show": false } })

        //     console.log(result);
        //     return res.status(201).send("ok");

    }
    else {
        return res.status(400).send("session Expired")
    }

})

//listen
app.listen(port,hostname, () => console.log(`Listening on localhost:${port}`))