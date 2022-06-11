import chat from "../databaseSchema/chatSchema.js";
import { nanoid } from 'nanoid'

export const newChat_chat = async (chatId) => {
    let found_chat = await chat.findOne({
        "chatId":chatId
    })
    const c = {
        "chatId":chatId,
        "active":true,
    }
    if (found_chat) {
        //user exit
        // console.log("user found")
        console.log(found_chat)
        return found_chat
    }
    else {
        //user do not exit so insert user in database
        found_chat = await chat.insertMany(c)
        // console.log("new user Created")
        console.log(found_chat[0])
        return found_chat[0]

    }
}
