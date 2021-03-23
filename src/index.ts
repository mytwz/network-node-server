/*
 * @Author: Summer
 * @LastEditors: Summer
 * @Description: 
 * @Date: 2021-03-18 11:16:46 +0800
 * @LastEditTime: 2021-03-23 11:54:07 +0800
 * @FilePath: /network-node-server/src/index.ts
 */

import zlib from "zlib";
import WebSocket from "ws";
import net from "net";
import CRON from "cron";
import Redis from "ioredis";
import { RedisOptions } from "ioredis";
import { EventEmitter } from "events";
import xor from "buffer-xor";
import request from "request";
import qs from "querystring";
import crypto from "crypto";
/**包类型 */
enum PackeType {
    /**握手 */
    shakehands = 1,
    /**心跳 */
    heartbeat,
    /**同步主机列表 */
    asyncserverlist,
    /**同步事件 */
    asyncevents,
    /**触发事件 */
    emitevent,
    /**同步任务 */
    asyncjob,
    /**删除任务 */
    deljob,
    /**触发任务 */
    emitjob,
    /**同步事件主机ID */
    asyncjobserverid,
    /**上线 */
    online
};

/**握手状态 */
enum Shakehands {
    /**未开始 */
    notstart = -1,
    /**开始 */
    start,
    /**进行中 */
    progress,
    /**结束 */
    end
}


let __index__ = 0
const id24_buffer = Buffer.alloc(16);

const Utils = {

    /**
     * 获取一个 24 位的ID 
     * - 进程ID + 时间戳后 6 位 + 6 位序列号 + 随机数后 6 位
     * - 经测试 100W 次运行中，没有发现重复ID
     */
    get ID24(): string {
        let offset = 0;
        id24_buffer.writeUInt32BE(+process.pid, offset); offset += 4;
        id24_buffer.writeUInt32BE(+String(Date.now()).substr(-6), offset); offset += 4;
        id24_buffer.writeUInt32BE((++__index__ > 999999) ? (__index__ = 1) : __index__, offset); offset += 4;
        id24_buffer.writeUInt32BE(+String(Math.random()).substr(-6), offset); offset += 4;
        return id24_buffer.toString("base64");
    },

    /**
     * 发送 HTTP POST
     * @param {*} url 
     * @param {*} data 
     * @param {*} headers 
     */
    HTTPPost(url: string, data: any = {}, headers = {}, key: string) {
        return new Promise((resolve, reject) => {
            url += (url.includes("?") ? "&" : "?") + qs.stringify({ t: Date.now() });
            data.sign = this.MD5(JSON.stringify(data), key);
            request({
                method: 'POST',
                url,
                headers: Object.assign({
                    'Content-Type': 'application/x-www-form-urlencoded'
                }, headers),
                json: true,
                form: { data: Utils.XOREncoder(data, key) }
            }, (error, response, body) => {
                if (error) {
                    console.error("HTTPPost-response", { url, error })
                    return reject(error);
                }
                let res = Utils.XORDecoder(body.data, key);
                resolve(res)
            });
        })
    },

    /**
     * MD5
     * @param str 
     */
    MD5(str: string, key: string): string {
        return crypto.createHash('md5').update(str + key).digest('hex');
    },
    
    XOREncoder(a: string | Object, key: string): string | Object {
        try {
            return xor(typeof (a) === "string" ? Buffer.from(a) : Buffer.from(JSON.stringify(a)), Buffer.from(key)).toString("base64");
        } catch (error) {
            console.error(error)
            return a;
        }
    },

    XORDecoder(a: string, key: string): string {
        try {
            return JSON.parse(xor(typeof (a) === "string" ? Buffer.from(a, "base64") : a, Buffer.from(key)).toString());
        } catch (error) {
            console.error(error)
            return a;
        }
    },
    /**
     * 
     * @param _type 
     * @param _data 
     */
    CodeEncoder(_type: PackeType, _data: any): Buffer {
        let type = Buffer.alloc(1); type.writeUInt8(+_type);
        switch (_type) {
            case PackeType.heartbeat: {
                // let buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(Date.now());
                return Buffer.concat([type/* , buffer */]);
            }
            case PackeType.shakehands: {
                let id = Buffer.from(_data.id || "");
                let data = Buffer.from(JSON.stringify(_data.data || ""));
                let ack = Buffer.alloc(1); ack.writeUInt8(+_data.ack);
                let idlength = Buffer.alloc(4); idlength.writeInt32BE(id.length);
                let data_length = Buffer.alloc(4); data_length.writeUInt32BE(data.length);
                return Buffer.concat([type, ack, idlength, id, data_length, data]);
            }
            case PackeType.asyncserverlist: {
                let size = Buffer.alloc(4); size.writeUInt32BE(_data.length);
                let list = [];
                for (let { id1, ip1, port1 } of _data) {
                    let id = Buffer.from(id1);
                    let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                    let ip = Buffer.from(ip1);
                    let iplength = Buffer.alloc(4); iplength.writeUInt32BE(ip.length)
                    let port = Buffer.alloc(4); port.writeUInt32BE(+port1);
                    list.push(Buffer.concat([idlength, id, iplength, ip, port]))
                }
                return Buffer.concat([type, size].concat(list));
            }
            case PackeType.online: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                let ip = Buffer.from(_data.ip);
                let iplength = Buffer.alloc(4); iplength.writeUInt32BE(ip.length)
                let port = Buffer.alloc(4); port.writeUInt32BE(+_data.port);
                return Buffer.concat([type, idlength, id, iplength, ip, port]);
            }
            case PackeType.asyncevents: {
                let events = [].concat(_data);
                let length = Buffer.alloc(4); length.writeUInt32BE(events.length);
                let buffers = events.map(name => {
                    let d = Buffer.from(name + "");
                    let l = Buffer.alloc(4); l.writeUInt32BE(d.length);
                    return Buffer.concat([l, d]);
                });
                return Buffer.concat([type, length].concat(buffers));
            }
            case PackeType.asyncjob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                let crontime = Buffer.from(_data.crontime);
                let cmd = Buffer.from(_data.cmd);
                let content = Buffer.from(JSON.stringify(_data.content));
                let cronlength = Buffer.alloc(4); cronlength.writeUInt32BE(crontime.length);
                let cmdlength = Buffer.alloc(4); cmdlength.writeUInt32BE(cmd.length);
                let contentlength = Buffer.alloc(4); contentlength.writeUInt32BE(content.length);
                return Buffer.concat([type, idlength, id, cronlength, crontime, cmdlength, cmd, contentlength, content]);
            }
            case PackeType.emitjob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            case PackeType.deljob: {
                let id = Buffer.from(_data.id);
                let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            case PackeType.emitevent: {
                let event = Buffer.from(_data.event);
                let eventLength = Buffer.alloc(4); eventLength.writeUInt32BE(event.length);
                let args = Buffer.from(JSON.stringify(_data.args));
                let argslength = Buffer.alloc(4); argslength.writeUInt32BE(args.length);
                return Buffer.concat([type, eventLength, event, argslength, args]);
            }
            case PackeType.asyncjobserverid: {
                let id = Buffer.from(_data || "");
                let idlength = Buffer.alloc(4); idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            default: {
                throw new Error(`not found packet type: ${_type}`)
            }
        }
    },

    /**
     * 
     * @param buffer 
     */
    CodeDecoder(buffer: Buffer) {
        let offset = 0;
        let type = buffer.readUInt8(offset++);
        switch (type) {
            case PackeType.shakehands: {
                let ack = buffer.readUInt8(offset++);
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                let datalength = buffer.readUInt32BE(offset); offset += 4;
                let dataStr = buffer.slice(offset, offset += datalength).toString();
                let data = JSON.parse(dataStr);
                return { type, id, ack, data };
            }
            case PackeType.heartbeat: {
                // let data = buffer.readBigUInt64BE(offset++);
                return { type/* , data */ }
            }
            case PackeType.asyncserverlist: {
                let size = buffer.readUInt32BE(offset); offset += 4;
                let servers = [];
                for (let i = 0; i < size; i++) {
                    let idlength = buffer.readUInt32BE(offset); offset += 4;
                    let id = buffer.slice(offset, offset += idlength).toString();
                    let iplength = buffer.readUInt32BE(offset); offset += 4;
                    let ip = buffer.slice(offset, offset += iplength).toString();
                    let port = buffer.readUInt32BE(offset);
                    servers.push({ id, ip, port })
                }
                return { type, servers };
            }
            case PackeType.online: {
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                let iplength = buffer.readUInt32BE(offset); offset += 4;
                let ip = buffer.slice(offset, offset += iplength).toString();
                let port = buffer.readUInt32BE(offset);
                return { type, id, ip, port };
            }
            case PackeType.asyncevents: {
                let length = buffer.readUInt32BE(offset); offset += 4;
                let events = [];
                for (let i = 0; i < length; i++) {
                    let nameLength = buffer.readUInt32BE(offset); offset += 4;
                    let name = buffer.slice(offset, offset += nameLength).toString();
                    events.push(name);
                }
                return { type, events };
            }
            case PackeType.emitevent: {
                let eventnamelength = buffer.readUInt32BE(offset); offset += 4;
                let eventname = buffer.slice(offset, offset += eventnamelength).toString();
                let argslength = buffer.readUInt32BE(offset); offset += 4;
                let argsStr = buffer.slice(offset, offset += argslength).toString();
                let args = JSON.parse(argsStr);
                return { type, eventname, args };
            }
            case PackeType.asyncjob: {
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength);
                let cronlength = buffer.readUInt32BE(offset); offset += 4;
                let crontime = buffer.slice(offset, offset += cronlength).toString();
                let cmdlength = buffer.readUInt32BE(offset); offset += 4;
                let cmd = buffer.slice(offset, offset += cmdlength).toString();
                let contentlength = buffer.readUInt32BE(offset); offset += 4;
                let contentStr = buffer.slice(offset, offset += contentlength).toString();
                let content = JSON.parse(contentStr);

                return { type, id, crontime, cmd, content };
            }
            case PackeType.emitjob: {
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
            case PackeType.deljob: {
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
            case PackeType.asyncjobserverid: {
                let idlength = buffer.readUInt32BE(offset); offset += 4;
                let id = buffer.slice(offset, offset += idlength).toString();
                return { type, id };
            }
        }

        return { type };
    }

};


class Connection extends WebSocket {
    protected status: Shakehands;
    public id: string;
    public events: Set<string>;
    constructor() {
        super(<string><unknown>null);
        this.status = Shakehands.start;
        this.id = "";
        this.events = new Set();

        this.on("message", (buffer: Buffer) => {
            if (Buffer.isBuffer(buffer)) {
                if (buffer.length > 2 && buffer.slice(0, 2).readUInt16BE() == 0x8b1f) buffer = zlib.gunzipSync(buffer);
                let packet = Utils.CodeDecoder(buffer);
                if (PackeType.heartbeat === packet.type) {
                    setTimeout(this.sendPing.bind(this), 1000);
                    this.emit("pong", packet.data)
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
                this.emit("data", this.id, packet)
            }
            else this.emit("data", this.id, buffer);
        });

    }


    /**
     * 发送数据包
     * @param {*} type 
     * @param {*} data 
     */
    sendPacket(type: PackeType, data?: any) {
        if (this.readyState === this.OPEN) {
            let packet = Utils.CodeEncoder(type, data); if (packet.length > 128) packet = zlib.gzipSync(packet);
            this.send(packet, { mask: true, binary: true });
        }
    }

    /**
     * 发送握手包
     * @param {*} ack 
     * @param {*} data 
     */
    sendShakehands(ack: Shakehands, id: string = this.id, data: any = {}) {
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
    sendServers(servers: string[]) {
        this.sendPacket(PackeType.online, servers)
    }

    /**
     * 发送上线通知
     * @param {*} id 
     * @param {*} ip 
     * @param {*} port 
     */
    sendOnline(id: string, ip: string, port: number) {
        this.sendPacket(PackeType.online, { id, ip, port })
    }

    /**
     * 同步事件
     * @param {*} eventNames 
     */
    sendSyncevents(eventNames: (string | symbol)[]) {
        this.sendPacket(PackeType.asyncevents, eventNames);
    }

    /**
     * 同步指令任务
     * @param {*} id 
     * @param {*} crontime 
     * @param {*} cmd 
     * @param {*} args 
     */
    sendSyncjob(id: string, crontime: string, cmd: string, args: any[]) {
        this.sendPacket(PackeType.asyncjob, { id, crontime, cmd, content: args });
    }

    /**
     * 同步事件执行
     * @param {*} event 
     * @param {*} args 
     */
    sendEmitevent(event: string, args: any[]) {
        this.sendPacket(PackeType.emitevent, { event, args })
    }

    /**
     * 执行指令任务
     * @param {*} id 
     */
    sendEmitjob(id: string) {
        this.sendPacket(PackeType.emitjob, { id });
    }

    /**
     * 删除指令任务
     * @param {*} id 
     */
    sendDeljob(id: string) {
        this.sendPacket(PackeType.deljob, { id });
    }

    /**
     * 同步时间服务器ID
     * @param {*} id 
     */
    sendSyncjobserverid(id: string) {
        this.sendPacket(PackeType.asyncjobserverid, id)
    }
}


class ClientConn extends Connection {
    private ip: string;
    private port: number;
    private reconnectionCount: number;
    constructor(id: string, ip: string, port: number) {
        super();
        this.id = id;
        this.ip = ip;
        this.port = port;
        this.reconnectionCount = 20;
        this.connect();
        this.on("close", _ => {
            this.status = Shakehands.notstart;
            setTimeout(this.reconnection.bind(this), 1000)
        });
    }

    public get addr():string { return `${this.ip}:${this.port}` }

    reconnection() {
        if (this.status === Shakehands.notstart && --this.reconnectionCount) {
            this.connect();
            console.log("发起重连", this.id)
        }
    }

    connect() {
        this.status = Shakehands.notstart;
        let socket = net.connect(this.port, this.ip, () => {
            this.reconnectionCount = 20;
            this.status = Shakehands.start;
            (<any>this).setSocket(socket, [], 0);
        });
        socket.on("error", _ => {
            if (this.status === Shakehands.notstart) this.emit("close")
        });
    }
}


class ServerConn extends Connection {
    constructor(socket: net.Socket) {
        super();
        (<any>this).setSocket(socket, [], 0);
    }
}

type NetworkAccess = {
    ip: string,
    port: number,
    id: string,
    redis: RedisOptions,
    jobServerKey: string,
    keepKey: string
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
async function requestNetworkAccess(url: string, username: string, password: string, id: string, ip: string, port: number, key: string): Promise<NetworkAccess> {
    return <NetworkAccess><any>Utils.HTTPPost(url + "/server/online", { username, password, id, ip, port }, {}, key);
}

/**服务配置 */
type SConfig = {
    /**入网用户名 */
    username: string,
    /**入网帐号密码 */
    password: string,
    /**中心服务地址 */
    centralUrl: string,
    /**本地网络Ip */
    ip: string,
    /**本地网络端口号 */
    port: number,
    /**与中心服务器通信的签名Key */
    signKey: string,
}

type CmdJobs = { [cmd: string]: Function }

class SServer extends EventEmitter {
    /**主机ID  */
    private id: string = Utils.ID24;
    /**服务端连接列表 */
    private SNodes: { [id: string]: ServerConn } = {};
    /**服务端连接列表 */
    private SNodeList: ServerConn[] = [];
    /**客户端连接列表 */
    private CNodes: { [id: string]: ClientConn } = {};
    /**客户端连接列表 */
    private CNodeList: ClientConn[] = [];
    /**Redis 客户端连接 */
    private redis: Redis.Redis = <any>null;
    /**定时任务服务器的标识 Key */
    private jobServerKey: string = "";
    /**定时任务服务器的ID  */
    private jobServerId: string = "";
    /**指令任务对象 */
    private cmdjobs: { [cmd: string]: Function } = {};
    /**定时任务对象 */
    private cronjobs: { [cmd: string]: CRON.CronJob } = {};
    /**本地 Socket 服务 */
    private server: net.Server;
    /**服务缓存 Key */
    private keepKey:string = "sserver-keepKey:";

    constructor(private config: SConfig) {
        super();

        this.server = net.createServer(socket => {
            let client = new ServerConn(socket);
            client.on("close", _ => { this.closeNode(client.id) })
            client.on("data", this.onmessage.bind(this));
            client.on("open", () => {
                client.sendSyncevents(this.eventNames());
                if(this.jobServerId === this.id) client.sendSyncjobserverid(this.jobServerId);
                for (let { id, crontime, cmd, args } of <Array<{ id: string, crontime:string, cmd:string, args:any[] }>><any[]>Object.values(this.cronjobs)) client.sendSyncjob(id, crontime, cmd, args)
                this.SNodeList.push(this.SNodes[client.id] = client);
            })
        });
    }

    /**
     * 绑定或者订阅事件
     * @param event 事件名称
     * @param fn 回调函数
     */
    public on(event: string, fn: (...args: any[]) => void) {
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
    public emit(event: string, ...args: any[]) {
        for (let client of this.CNodeList.filter(c => c.events.has(event))) {
            client.sendEmitevent(event, args);
        }

        return super.emit(event, ...args);;
    }

    /**
     * 生成客户端链接ID 
     * @param ip 
     * @param port 
     * @requires MD5ID
     */
    private SID(ip: string, port: number): string {
        return Utils.MD5(`${this.id}-${ip}-${port}`, this.config.signKey);
    }

    /**
     * 连接网络节点
     * @param ip 远端主机IP
     * @param port 远端主机端口号
     * @param isNotice 是否广播其他主机连接此地址
     */
    private connectNode(ip: string, port: number, isNotice: boolean = true) {
        try {
            let client = new ClientConn(this.SID(ip, port), ip, port);
            client.on("close", _ => { this.closeNode(client.id) })
            client.on("data", this.onmessage.bind(this));
            client.on("open", () => {
                this.CNodeList.push(this.CNodes[client.id] = client);
                client.sendPing()
                client.sendShakehands(Shakehands.start, client.id)
                isNotice && client.sendOnline(this.id, this.config.ip, this.config.port)
            })
        } catch (error) {
            console.error("connectNode", error)
        }
    }

    /**
     *开始执行定时任务
     */
    private startJobasync() {
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
    public job(crontime: string, cmd: string, ...args: any[]): string {
        let id = Utils.ID24;
        for (let client of this.CNodeList) {
            client.sendSyncjob(id, crontime, cmd, args);
        }

        return this.addCronJon(id, crontime, cmd, ...args)
    }

    /**
     * 移除定时任务
     * @param id 
     */
    public removeJob(id: string){
        let task = this.cronjobs[id];
        if(task){
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
    public execCmd(id: string) {
        try {
            let client = [0, ...this.CNodeList].sort(_ => Math.random() - .5).pop()
            if (client instanceof ClientConn) client.sendEmitjob(id);
            else this.onmessage(this.id, { type: PackeType.emitjob, id });
        } catch (error) {
            console.error("addCronJon-执行报错", error)
        }
    }

    /**
     * 添加定时任务
     * @param id 任务ID 
     * @param crontime cron 格式的时间参数
     * @param cmd 指令名称
     * @param args 携带参数
     */
    private addCronJon(id: string, crontime: string, cmd: string, ...args: any[]): string {
        if (this.cronjobs[id]) return "";

        let task = CRON.job(crontime, () => { this.execCmd(id); });

        (<any>task).crontime = crontime;
        (<any>task).cmd = cmd;
        (<any>task).args = args;
        (<any>task).id = id;

        this.cronjobs[id] = task;
        
        if (this.jobServerId === this.id) task.start();

        return id;
    }

    /**
     * 设置任务指令
     * @param cmds 指令对象
     */
    public setCmdJobs(cmds: CmdJobs) {
        this.cmdjobs = cmds;
    }


    /**
     * 处理消息
     * @param id 链接ID  
     * @param message 消息
     */
    private async onmessage(id: string, message: any) {

        switch (message.type) {
            case PackeType.asyncjobserverid: {
                this.jobServerId = id;
                break;
            }
            case PackeType.asyncjob: {
                let { id, crontime, cmd, content: args } = message;
                this.addCronJon(id, crontime, cmd, ...args)
                break;
            }
            case PackeType.emitjob: {
                try {
                    let task = <any>this.cronjobs[message.id];
                    let job = this.cmdjobs[task.cmd];
                    if (task && job instanceof Function) Promise.resolve(job.apply(this.cmdjobs, (<any>task).args))
                } catch (error) {
                    console.error("onmessage", error)
                }
                break;
            }
            case PackeType.deljob:{
                let task = this.cronjobs[message.id];
                if(task){
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
                super.emit(eventname, ...args);
                break;
            }
            case PackeType.online: {
                // 有服务器上线
                let cid = this.SID(message.ip, message.port);

                if (this.SNodes[id]) {
                    if (!this.CNodes[cid]) {
                        this.connectNode(message.ip, message.port, false);
                        for (let client of this.SNodeList) {
                            if (client.id != id) client.sendOnline(message.id, message.ip, message.port);
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
    }

    /**
     * 主机断线
     * @param id 主机ID 
     */
    private async closeNode(id: string) {
        if (this.CNodes[id]) {

            await this.redis.setnx(`${this.keepKey}:${this.CNodes[id].addr}`, 0);
            
            delete this.CNodes[id]; let i = this.CNodeList.findIndex(c => c.id === id); if (this.CNodeList[i]) this.CNodeList.splice(i, 1);

        }
        if (this.SNodes[id]) {
            delete this.SNodes[id]; let i = this.SNodeList.findIndex(c => c.id === id); if (this.SNodeList[i]) this.SNodeList.splice(i, 1);
        }
        if (this.jobServerId === id) {
            await this.redis.del(this.jobServerKey);
            this.vieJobServer();
        }
        console.log("断线", id)
    }

    /**
     * 争夺任务服务器的执行权限
     */
    private async vieJobServer() {
        if (await this.redis.exists(this.jobServerKey)) return;
        let lock = await this.redis.set(this.jobServerKey + "_lock", 1, "ex", 1, "nx");
        if (lock) {
            await this.redis.set(this.jobServerKey, this.jobServerId = this.id);
            this.startJobasync();
            for (let client of this.CNodeList) {
                client.sendSyncjobserverid(client.id);
            }
        }
    }

    /**
     * 启动服务
     * @param cb  启动回调
     */
    async start(cb: Function) {
        let { keepKey, ip, port, id, jobServerKey, redis } = await requestNetworkAccess(this.config.centralUrl, this.config.username, this.config.password, this.id, this.config.ip, this.config.port, this.config.signKey);
        if(redis){
            this.keepKey = keepKey;
            this.jobServerKey = jobServerKey;
            this.redis = new Redis(redis);
            if (redis.password) this.redis.auth(redis.password).then(_ => console.log("redis", "auth successfully"));
    
            this.server.listen(this.config.port, async () => {
                await this.redis.set(`${this.keepKey}:${this.config.ip}:${this.config.port}`, 1);
                if (ip && ip + port !== this.config.ip + this.config.port) this.connectNode(ip, port);
                await this.vieJobServer();
                cb && cb();
            })
        }
    }
}

export = SServer;
