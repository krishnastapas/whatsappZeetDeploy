import mongoose from "mongoose"

const schema=mongoose.Schema({
    name:String,
    email:String,
    photoURL:String,
    chats:[]
})

export default mongoose.model("Users",schema)