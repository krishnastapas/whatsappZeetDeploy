import Users from "../databaseSchema/UsersSchema.js";
import { nanoid } from 'nanoid'
// import chat from "../database/databaseSchema/chatSchema.js";
import chat from "../databaseSchema/chatSchema.js";

export const newMessage = async (chatId, email, name, message, time) => {
    const myquery = { "chatId": chatId ,"active":true};
    const newvalues = {
        $push: {
            messages: {  $each: [{"email":email, "name": name, "message": message, "time": time }],
            $position: 0
             }
        }
    }

    let result = await chat.updateOne(myquery, newvalues);
    return result;
}