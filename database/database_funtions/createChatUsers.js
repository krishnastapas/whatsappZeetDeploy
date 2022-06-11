import Users from "../databaseSchema/UsersSchema.js";
import { nanoid } from 'nanoid'

export const newChat = async (req_email, email, chatname,chatPhoto,chatId) => {
    const myquery = { "email": req_email };
    const newvalues = {
        $push: {
            chats: {
                $each: [{ "name": chatname, "email": email, "chatId": chatId, "chatPhoto":chatPhoto, "show": true }],
                $position: 0
            }
        }
    }

    let result = await Users.updateOne(myquery, newvalues);
    return result;
}