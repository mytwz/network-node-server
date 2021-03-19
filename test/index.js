/*
 * @Author: Summer
 * @LastEditors: Summer
 * @Description: 
 * @Date: 2021-03-19 10:16:42 +0800
 * @LastEditTime: 2021-03-19 14:36:56 +0800
 * @FilePath: /network-node-server/test/index.js
 */
const SServer = require("../")

const app = new SServer({
    ip:"10.9.16.24", port:+process.argv[2],
    username:"summer", password:"summer",
    signKey:"10.9.16.24", centralUrl:"http://10.9.16.24:8080"
})

app.start(function(){
    console.log("启动成功");
})