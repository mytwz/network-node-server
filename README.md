![npm version](https://img.shields.io/badge/npm-1.0.0-brightgreen)
 > 简易版的分布式消息服务器，将消息同步到所有网络节点和一个简易版的分布式任务调度，觉得小弟写的还行的话，就给个[Star](https://github.com/mytwz/network-node-server)⭐️吧~

 ## 食用说明

 ### [安装启动中心服务器](https://github.com/mytwz/network-node-szook)

```javascript
const SServer = require("network-node-server")
const app = new SServer({
    /**中心服务器的地址 */
    centralUrl: "http[s]://[链接地址]",
    /**入网帐号*/
    username: "summer",
    /**密码*/
    password: "summer",
    /**本机入网IP，该地址需要其他服务器可达*/
    ip: "10.9.16.34", port: 8081,
    signKey:"与中心服务器通信的Key",
})

// 订阅一个事件
app.on("test", function(args){
    console.log("全局触发事件", /*收到的参数*/args);
})

// 设置定时指令任务
app.setCmdJobs({

    // 使用对象 Key 作为 cmd 指令名称
    test(args){
        console.log("触发一个定时指令")
    }
});
// 添加一个分布式定时任务： 每两秒钟触发一次： 绑定参数 userid\roomid
// 支持 cron 语法
app.job("0/2 * * * * *", "test", "userid", "roomid");


app.start(function(){
    console.log("启动成功");
    // 全网触发一个事件
    app.emit("test", 1, 2, 3);
})


```