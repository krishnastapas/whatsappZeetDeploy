import mongoose from "mongoose"

const schema=mongoose.Schema({
    chatId:String,
    active:Boolean,
    messages:[]
})

export default mongoose.model("chat",schema)