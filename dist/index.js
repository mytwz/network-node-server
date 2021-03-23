"use strict";
/*
 * @Author: Summer
 * @LastEditors: Summer
 * @Description:
 * @Date: 2021-03-18 11:16:46 +0800
 * @LastEditTime: 2021-03-23 16:09:36 +0800
 * @FilePath: /network-node-server/src/index.ts
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const zlib_1 = __importDefault(require("zlib"));
const ws_1 = __importDefault(require("ws"));
const net_1 = __importDefault(require("net"));
const cron_1 = __importDefault(require("cron"));
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const buffer_xor_1 = __importDefault(require("buffer-xor"));
const request_1 = __importDefault(require("request"));
const querystring_1 = __importDefault(require("querystring"));
const crypto_1 = __importDefault(require("crypto"));
/**包类型 */
var PackeType;
(function (PackeType) {
    /**握手 */
    PackeType[PackeType["shakehands"] = 1] = "shakehands";
    /**心跳 */
    PackeType[PackeType["heartbeat"] = 2] = "heartbeat";
    /**同步主机列表 */
    PackeType[PackeType["asyncserverlist"] = 3] = "asyncserverlist";
    /**同步事件 */
    PackeType[PackeType["asyncevents"] = 4] = "asyncevents";
    /**触发事件 */
    PackeType[PackeType["emitevent"] = 5] = "emitevent";
    /**同步任务 */
    PackeType[PackeType["asyncjob"] = 6] = "asyncjob";
    /**删除任务 */
    PackeType[PackeType["deljob"] = 7] = "deljob";
    /**触发任务 */
    PackeType[PackeType["emitjob"] = 8] = "emitjob";
    /**同步事件主机ID */
    PackeType[PackeType["asyncjobserverid"] = 9] = "asyncjobserverid";
    /**上线 */
    PackeType[PackeType["online"] = 10] = "online";
})(PackeType || (PackeType = {}));
;
/**握手状态 */
var Shakehands;
(function (Shakehands) {
    /**未开始 */
    Shakehands[Shakehands["notstart"] = -1] = "notstart";
    /**开始 */
    Shakehands[Shakehands["start"] = 0] = "start";
    /**进行中 */
    Shakehands[Shakehands["progress"] = 1] = "progress";
    /**结束 */
    Shakehands[Shakehands["end"] = 2] = "end";
})(Shakehands || (Shakehands = {}));
let __index__ = 0;
const id24_buffer = Buffer.alloc(16);
const Utils = {
    /**
     * 获取一个 24 位的ID
     * - 进程ID + 时间戳后 6 位 + 6 位序列号 + 随机数后 6 位
     * - 经测试 100W 次运行中，没有发现重复ID
     */
    get ID24() {
        let offset = 0;
        id24_buffer.writeUInt32BE(+process.pid, offset);
        offset += 4;
        id24_buffer.writeUInt32BE(+String(Date.now()).substr(-6), offset);
        offset += 4;
        id24_buffer.writeUInt32BE((++__index__ > 999999) ? (__index__ = 1) : __index__, offset);
        offset += 4;
        id24_buffer.writeUInt32BE(+String(Math.random()).substr(-6), offset);
        offset += 4;
        return id24_buffer.toString("base64");
    },
    /**
     * 发送 HTTP POST
     * @param {*} url
     * @param {*} data
     * @param {*} headers
     */
    HTTPPost(url, data = {}, headers = {}, key) {
        return new Promise((resolve, reject) => {
            url += (url.includes("?") ? "&" : "?") + querystring_1.default.stringify({ t: Date.now() });
            data.sign = this.MD5(JSON.stringify(data), key);
            request_1.default({
                method: 'POST',
                url,
                headers: Object.assign({
                    'Content-Type': 'application/x-www-form-urlencoded'
                }, headers),
                json: true,
                form: { data: Utils.XOREncoder(data, key) }
            }, (error, response, body) => {
                if (error) {
                    console.error("HTTPPost-response", { url, error });
                    return reject(error);
                }
                let res = Utils.XORDecoder(body.data, key);
                resolve(res);
            });
        });
    },
    /**
     * MD5
     * @param str
     */
    MD5(str, key) {
        return crypto_1.default.createHash('md5').update(str + key).digest('hex');
    },
    XOREncoder(a, key) {
        try {
            return buffer_xor_1.default(typeof (a) === "string" ? Buffer.from(a) : Buffer.from(JSON.stringify(a)), Buffer.from(key)).toString("base64");
        }
        catch (error) {
            console.error(error);
            return a;
        }
    },
    XORDecoder(a, key) {
        try {
            return JSON.parse(buffer_xor_1.default(typeof (a) === "string" ? Buffer.from(a, "base64") : a, Buffer.from(key)).toString());
        }
        catch (error) {
            console.error(error);
            return a;
        }
    },
    /**
     *
     * @param _type
     * @param _data
     */
    CodeEncoder(_type, _data) {
        let type = Buffer.alloc(1);
        type.writeUInt8(+_type);
        switch (_type) {
            case PackeType.heartbeat: {
                // let buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(Date.now());
                return Buffer.concat([type /* , buffer */]);
            }
            case PackeType.shakehands: {
                let id = Buffer.from(_data.id || "");
                let data = Buffer.from(JSON.stringify(_data.data || ""));
                let ack = Buffer.alloc(1);
                ack.writeUInt8(+_data.ack);
                let idlength = Buffer.alloc(4);
                idlength.writeInt32BE(id.length);
                let data_length = Buffer.alloc(4);
                data_length.writeUInt32BE(data.length);
                return Buffer.concat([type, ack, idlength, id, data_length, data]);
            }
            case PackeType.asyncserverlist: {
                let size = Buffer.alloc(4);
                size.writeUInt32BE(_data.length);
                let list = [];
                for (let { id1, ip1, port1 } of _data) {
                    let id = Buffer.from(id1);
                    let idlength = Buffer.alloc(4);
                    idlength.writeUInt32BE(id.length);
                    let ip = Buffer.from(ip1);
                    let iplength = Buffer.alloc(4);
                    iplength.writeUInt32BE(ip.length);
                    let port = Buffer.alloc(4);
                    port.writeUInt32BE(+port1);
                    list.push(Buffer.concat([idlength, id, iplength, ip, port]));
                }
                return Buffer.concat([type, size].concat(list));
            }
            case PackeType.online: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                let ip = Buffer.from(_data.ip);
                let iplength = Buffer.alloc(4);
                iplength.writeUInt32BE(ip.length);
                let port = Buffer.alloc(4);
                port.writeUInt32BE(+_data.port);
                return Buffer.concat([type, idlength, id, iplength, ip, port]);
            }
            case PackeType.asyncevents: {
                let events = [].concat(_data);
                let length = Buffer.alloc(4);
                length.writeUInt32BE(events.length);
                let buffers = events.map(name => {
                    let d = Buffer.from(name + "");
                    let l = Buffer.alloc(4);
                    l.writeUInt32BE(d.length);
                    return Buffer.concat([l, d]);
                });
                return Buffer.concat([type, length].concat(buffers));
            }
            case PackeType.asyncjob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                let crontime = Buffer.from(_data.crontime);
                let cmd = Buffer.from(_data.cmd);
                let content = Buffer.from(JSON.stringify(_data.content));
                let cronlength = Buffer.alloc(4);
                cronlength.writeUInt32BE(crontime.length);
                let cmdlength = Buffer.alloc(4);
                cmdlength.writeUInt32BE(cmd.length);
                let contentlength = Buffer.alloc(4);
                contentlength.writeUInt32BE(content.length);
                return Buffer.concat([type, idlength, id, cronlength, crontime, cmdlength, cmd, contentlength, content]);
            }
            case PackeType.emitjob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            case PackeType.deljob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            case PackeType.emitevent: {
                let event = Buffer.from(_data.event);
                let eventLength = Buffer.alloc(4);
                eventLength.writeUInt32BE(event.length);
                let args = Buffer.from(JSON.stringify(_data.args));
                let argslength = Buffer.alloc(4);
                argslength.writeUInt32BE(args.length);
                return Buffer.concat([type, eventLength, event, argslength, args]);
            }
            case PackeType.asyncjobserverid: {
                let id = Buffer.from(_data || "");
                let idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            default: {
                throw new Error(`not found packet type: ${_type}`);
            }
        }
    },
    /**
     *
     * @param buffer
     */
    CodeDecoder(buffer) {
        let offset = 0;
        let type = buffer.readUInt8(offset++);
        switch (type) {
            case PackeType.shakehands: {
                let ack = buffer.readUInt8(offset++);
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                let datalength = buffer.readUInt32BE(offset);
                offset += 4;
                let dataStr = buffer.slice(offset, offset += datalength).toString();
                let data = JSON.parse(dataStr);
                return { type, id, ack, data };
            }
            case PackeType.heartbeat: {
                // let data = buffer.readBigUInt64BE(offset++);
                return { type /* , data */ };
            }
            case PackeType.asyncserverlist: {
                let size = buffer.readUInt32BE(offset);
                offset += 4;
                let servers = [];
                for (let i = 0; i < size; i++) {
                    let idlength = buffer.readUInt32BE(offset);
                    offset += 4;
                    let id = buffer.slice(offset, offset += idlength).toString();
                    let iplength = buffer.readUInt32BE(offset);
                    offset += 4;
                    let ip = buffer.slice(offset, offset += iplength).toString();
                    let port = buffer.readUInt32BE(offset);
                    servers.push({ id, ip, port });
                }
                return { type, servers };
            }
            case PackeType.online: {
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                let iplength = buffer.readUInt32BE(offset);
                offset += 4;
                let ip = buffer.slice(offset, offset += iplength).toString();
                let port = buffer.readUInt32BE(offset);
                return { type, id, ip, port };
            }
            case PackeType.asyncevents: {
                let length = buffer.readUInt32BE(offset);
                offset += 4;
                let events = [];
                for (let i = 0; i < length; i++) {
                    let nameLength = buffer.readUInt32BE(offset);
                    offset += 4;
                    let name = buffer.slice(offset, offset += nameLength).toString();
                    events.push(name);
                }
                return { type, events };
            }
            case PackeType.emitevent: {
                let eventnamelength = buffer.readUInt32BE(offset);
                offset += 4;
                let eventname = buffer.slice(offset, offset += eventnamelength).toString();
                let argslength = buffer.readUInt32BE(offset);
                offset += 4;
                let argsStr = buffer.slice(offset, offset += argslength).toString();
                let args = JSON.parse(argsStr);
                return { type, eventname, args };
            }
            case PackeType.asyncjob: {
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength);
                let cronlength = buffer.readUInt32BE(offset);
                offset += 4;
                let crontime = buffer.slice(offset, offset += cronlength).toString();
                let cmdlength = buffer.readUInt32BE(offset);
                offset += 4;
                let cmd = buffer.slice(offset, offset += cmdlength).toString();
                let contentlength = buffer.readUInt32BE(offset);
                offset += 4;
                let contentStr = buffer.slice(offset, offset += contentlength).toString();
                let content = JSON.parse(contentStr);
                return { type, id, crontime, cmd, content };
            }
            case PackeType.emitjob: {
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
            case PackeType.deljob: {
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
            case PackeType.asyncjobserverid: {
                let idlength = buffer.readUInt32BE(offset);
                offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
        }
        return { type };
    }
};
class Connection extends ws_1.default {
    constructor() {
        super(null);
        this.status = Shakehands.start;
        this.id = "";
        this.events = new Set();
        this.on("message", (buffer) => {
            if (Buffer.isBuffer(buffer)) {
                if (buffer.length > 2 && buffer.slice(0, 2).readUInt16BE() == 0x8b1f)
                    buffer = zlib_1.default.gunzipSync(buffer);
                let packet = Utils.CodeDecoder(buffer);
                if (PackeType.heartbeat === packet.type) {
                    setTimeout(this.sendPing.bind(this), 1000);
                    this.emit("pong", packet.data);
                }
                else if (PackeType.shakehands === packet.type) {
                    let ack = packet.ack, id = packet.id || "", data = packet.data;
                    if (Shakehands.start === ack) {
                        this.id = id;
                        this.sendShakehands(Shakehands.progress, id);
                    }
                    else if (Shakehands.progress === ack) {
                        this.sendShakehands(Shakehands.end);
                    }
                    else if (Shakehands.end === ack) {
                        this.sendShakehands(Shakehands.end);
                        this.emit("open");
                    }
                }
                this.emit("data", this.id, packet);
            }
            else
                this.emit("data", this.id, buffer);
        });
    }
    /**
     * 发送数据包
     * @param {*} type
     * @param {*} data
     */
    sendPacket(type, data) {
        if (this.readyState === this.OPEN) {
            let packet = Utils.CodeEncoder(type, data);
            if (packet.length > 128)
                packet = zlib_1.default.gzipSync(packet);
            this.send(packet, { mask: true, binary: true });
        }
    }
    /**
     * 发送握手包
     * @param {*} ack
     * @param {*} data
     */
    sendShakehands(ack, id = this.id, data = {}) {
        if (this.status !== Shakehands.end) {
            this.sendPacket(PackeType.shakehands, { ack, id, data });
        }
        this.status = ack;
    }
    /**发送心跳包 */
    sendPing() {
        this.sendPacket(PackeType.heartbeat);
        this.emit("ping");
    }
    /**
     * 发送服务器列表
     * @param {*} servers
     */
    sendServers(servers) {
        this.sendPacket(PackeType.online, servers);
    }
    /**
     * 发送上线通知
     * @param {*} id
     * @param {*} ip
     * @param {*} port
     */
    sendOnline(id, ip, port) {
        this.sendPacket(PackeType.online, { id, ip, port });
    }
    /**
     * 同步事件
     * @param {*} eventNames
     */
    sendSyncevents(eventNames) {
        this.sendPacket(PackeType.asyncevents, eventNames);
    }
    /**
     * 同步指令任务
     * @param {*} id
     * @param {*} crontime
     * @param {*} cmd
     * @param {*} args
     */
    sendSyncjob(id, crontime, cmd, args) {
        this.sendPacket(PackeType.asyncjob, { id, crontime, cmd, content: args });
    }
    /**
     * 同步事件执行
     * @param {*} event
     * @param {*} args
     */
    sendEmitevent(event, args) {
        this.sendPacket(PackeType.emitevent, { event, args });
    }
    /**
     * 执行指令任务
     * @param {*} id
     */
    sendEmitjob(id) {
        this.sendPacket(PackeType.emitjob, { id });
    }
    /**
     * 删除指令任务
     * @param {*} id
     */
    sendDeljob(id) {
        this.sendPacket(PackeType.deljob, { id });
    }
    /**
     * 同步时间服务器ID
     * @param {*} id
     */
    sendSyncjobserverid(id) {
        this.sendPacket(PackeType.asyncjobserverid, id);
    }
}
class ClientConn extends Connection {
    constructor(id, ip, port) {
        super();
        this.id = id;
        this.ip = ip;
        this.port = port;
        this.reconnectionCount = 20;
        this.connect();
        this.on("close", _ => {
            this.status = Shakehands.notstart;
            setTimeout(this.reconnection.bind(this), 1000);
        });
    }
    get addr() { return `${this.ip}:${this.port}`; }
    reconnection() {
        if (this.status === Shakehands.notstart && --this.reconnectionCount) {
            this.connect();
            console.log("发起重连", this.id);
        }
    }
    connect() {
        this.status = Shakehands.notstart;
        let socket = net_1.default.connect(this.port, this.ip, () => {
            this.reconnectionCount = 20;
            this.status = Shakehands.start;
            this.setSocket(socket, [], 0);
        });
        socket.on("error", _ => {
            if (this.status === Shakehands.notstart)
                this.emit("close");
        });
    }
}
class ServerConn extends Connection {
    constructor(socket) {
        super();
        this.setSocket(socket, [], 0);
    }
}
/**
 * 请求入网
 * @param url
 * @param username
 * @param password
 * @param id
 * @param ip
 * @param port
 * @param key
 */
function requestNetworkAccess(url, username, password, id, ip, port, key) {
    return __awaiter(this, void 0, void 0, function* () {
        return Utils.HTTPPost(url + "/server/online", { username, password, id, ip, port }, {}, key);
    });
}
class SServer extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        /**主机ID  */
        this.id = Utils.ID24;
        /**服务端连接列表 */
        this.SNodes = {};
        /**服务端连接列表 */
        this.SNodeList = [];
        /**客户端连接列表 */
        this.CNodes = {};
        /**客户端连接列表 */
        this.CNodeList = [];
        /**Redis 客户端连接 */
        this.redis = null;
        /**定时任务服务器的标识 Key */
        this.jobServerKey = "";
        /**定时任务服务器的ID  */
        this.jobServerId = "";
        /**指令任务对象 */
        this.cmdjobs = {};
        /**定时任务对象 */
        this.cronjobs = {};
        /**服务缓存 Key */
        this.keepKey = "sserver-keepKey:";
        this.server = net_1.default.createServer(socket => {
            let client = new ServerConn(socket);
            client.on("close", _ => { this.closeNode(client.id); });
            client.on("data", this.onmessage.bind(this));
            client.on("open", () => {
                client.sendSyncevents(this.eventNames());
                if (this.jobServerId === this.id)
                    client.sendSyncjobserverid(this.jobServerId);
                for (let { id, crontime, cmd, args } of Object.values(this.cronjobs))
                    client.sendSyncjob(id, crontime, cmd, args);
                this.SNodeList.push(this.SNodes[client.id] = client);
            });
        });
    }
    /**
     * 绑定或者订阅事件
     * @param event 事件名称
     * @param fn 回调函数
     */
    on(event, fn) {
        super.on(event, fn);
        for (let client of this.CNodeList) {
            client.sendSyncevents([event]);
        }
        return this;
    }
    /**
     * 执行绑定的网络事件
     * @param event 事件名称
     * @param args 携带参数
     */
    emit(event, ...args) {
        for (let client of this.CNodeList.filter(c => c.events.has(event))) {
            client.sendEmitevent(event, args);
        }
        return super.emit(event, ...args);
        ;
    }
    /**
     * 生成客户端链接ID
     * @param ip
     * @param port
     * @requires MD5ID
     */
    SID(ip, port) {
        return Utils.MD5(`${this.id}-${ip}-${port}`, this.config.signKey);
    }
    /**
     * 连接网络节点
     * @param ip 远端主机IP
     * @param port 远端主机端口号
     * @param isNotice 是否广播其他主机连接此地址
     */
    connectNode(ip, port, isNotice = true) {
        try {
            let client = new ClientConn(this.SID(ip, port), ip, port);
            client.on("close", _ => { this.closeNode(client.id); });
            client.on("data", this.onmessage.bind(this));
            client.on("open", () => {
                this.CNodeList.push(this.CNodes[client.id] = client);
                client.sendPing();
                client.sendShakehands(Shakehands.start, client.id);
                isNotice && client.sendOnline(this.id, this.config.ip, this.config.port);
            });
        }
        catch (error) {
            console.error("connectNode", error);
        }
    }
    /**
     *开始执行定时任务
     */
    startJobasync() {
        if (this.jobServerId === this.id) {
            for (let cmd in this.cronjobs) {
                let task = this.cronjobs[cmd];
                task.start();
            }
        }
    }
    /**
     * 添加定时任务
     * @param crontime cron 时间参数
     * @param cmd 任务指令
     * @param args 携带参数
     * @requires 任务ID
     */
    job(crontime, cmd, ...args) {
        let id = Utils.ID24;
        for (let client of this.CNodeList) {
            client.sendSyncjob(id, crontime, cmd, args);
        }
        return this.addCronJon(id, crontime, cmd, ...args);
    }
    /**
     * 移除定时任务
     * @param id
     */
    removeJob(id) {
        let task = this.cronjobs[id];
        if (task) {
            task.stop();
            delete this.cronjobs[id];
            for (let client of this.CNodeList) {
                client.sendDeljob(id);
            }
        }
    }
    /**
     * 执行定时任务
     * @param id 任务ID
     */
    execCmd(id) {
        try {
            let client = [0, ...this.CNodeList].sort(_ => Math.random() - .5).pop();
            if (client instanceof ClientConn)
                client.sendEmitjob(id);
            else
                this.onmessage(this.id, { type: PackeType.emitjob, id });
        }
        catch (error) {
            console.error("addCronJon-执行报错", error);
        }
    }
    /**
     * 添加定时任务
     * @param id 任务ID
     * @param crontime cron 格式的时间参数
     * @param cmd 指令名称
     * @param args 携带参数
     */
    addCronJon(id, crontime, cmd, ...args) {
        if (this.cronjobs[id])
            return "";
        let task = cron_1.default.job(crontime, () => { this.execCmd(id); });
        task.crontime = crontime;
        task.cmd = cmd;
        task.args = args;
        task.id = id;
        this.cronjobs[id] = task;
        if (this.jobServerId === this.id)
            task.start();
        return id;
    }
    /**
     * 设置任务指令
     * @param cmds 指令对象
     */
    setCmdJobs(cmds) {
        this.cmdjobs = cmds;
    }
    /**
     * 处理消息
     * @param id 链接ID
     * @param message 消息
     */
    onmessage(id, message) {
        const _super = Object.create(null, {
            emit: { get: () => super.emit }
        });
        return __awaiter(this, void 0, void 0, function* () {
            switch (message.type) {
                case PackeType.asyncjobserverid: {
                    this.jobServerId = id;
                    break;
                }
                case PackeType.asyncjob: {
                    let { id, crontime, cmd, content: args } = message;
                    this.addCronJon(id, crontime, cmd, ...args);
                    break;
                }
                case PackeType.emitjob: {
                    try {
                        let task = this.cronjobs[message.id];
                        let job = this.cmdjobs[task.cmd];
                        if (task && job instanceof Function)
                            Promise.resolve(job.apply(this.cmdjobs, task.args));
                    }
                    catch (error) {
                        console.error("onmessage", error);
                    }
                    break;
                }
                case PackeType.deljob: {
                    let task = this.cronjobs[message.id];
                    if (task) {
                        task.stop();
                        delete this.cronjobs[message.id];
                    }
                    break;
                }
                case PackeType.asyncevents: {
                    for (let name of message.events) {
                        this.CNodes[id].events.add(name);
                    }
                    break;
                }
                case PackeType.emitevent: {
                    let { eventname, args } = message;
                    _super.emit.call(this, eventname, ...args);
                    break;
                }
                case PackeType.online: {
                    // 有服务器上线
                    let cid = this.SID(message.ip, message.port);
                    if (this.SNodes[id]) {
                        if (!this.CNodes[cid]) {
                            this.connectNode(message.ip, message.port, false);
                            for (let client of this.SNodeList) {
                                if (client.id != id)
                                    client.sendOnline(message.id, message.ip, message.port);
                            }
                        }
                    }
                    else if (this.CNodes[id]) {
                        if (!this.CNodes[cid]) {
                            this.connectNode(message.ip, message.port);
                        }
                    }
                    break;
                }
            }
        });
    }
    /**
     * 主机断线
     * @param id 主机ID
     */
    closeNode(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.CNodes[id]) {
                yield this.redis.setnx(`${this.keepKey}:${this.CNodes[id].addr}`, 0);
                delete this.CNodes[id];
                let i = this.CNodeList.findIndex(c => c.id === id);
                if (this.CNodeList[i])
                    this.CNodeList.splice(i, 1);
            }
            if (this.SNodes[id]) {
                delete this.SNodes[id];
                let i = this.SNodeList.findIndex(c => c.id === id);
                if (this.SNodeList[i])
                    this.SNodeList.splice(i, 1);
            }
            if (this.jobServerId === id) {
                yield this.redis.del(this.jobServerKey);
                this.vieJobServer();
            }
            console.log("断线", id);
        });
    }
    /**
     * 争夺任务服务器的执行权限
     */
    vieJobServer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.redis.exists(this.jobServerKey))
                return;
            let lock = yield this.redis.set(this.jobServerKey + "_lock", 1, "ex", 1, "nx");
            if (lock) {
                yield this.redis.set(this.jobServerKey, this.jobServerId = this.id);
                this.startJobasync();
                for (let client of this.CNodeList) {
                    client.sendSyncjobserverid(client.id);
                }
            }
        });
    }
    /**
     * 启动服务
     * @param cb  启动回调
     */
    start(cb) {
        return __awaiter(this, void 0, void 0, function* () {
            let { code, msg, keepKey, ip, port, id, jobServerKey, redis } = yield requestNetworkAccess(this.config.centralUrl, this.config.username, this.config.password, this.id, this.config.ip, this.config.port, this.config.signKey);
            if (code == 100 && redis) {
                this.keepKey = keepKey;
                this.jobServerKey = jobServerKey;
                this.redis = new ioredis_1.default(redis);
                if (redis.password)
                    this.redis.auth(redis.password).then(_ => console.log("redis", "auth successfully"));
                this.server.listen(this.config.port, () => __awaiter(this, void 0, void 0, function* () {
                    yield this.redis.set(`${this.keepKey}:${this.config.ip}:${this.config.port}`, 1);
                    if (ip && ip + port !== this.config.ip + this.config.port)
                        this.connectNode(ip, port);
                    yield this.vieJobServer();
                    cb && cb();
                }));
            }
            console.log({ code, msg });
        });
    }
}
module.exports = SServer;
