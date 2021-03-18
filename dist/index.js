"use strict";
/*
 * @Author: Summer
 * @LastEditors: Summer
 * @Description:
 * @Date: 2021-03-18 11:16:46 +0800
 * @LastEditTime: 2021-03-18 16:29:26 +0800
 * @FilePath: /network-node-server/src/index.ts
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var zlib_1 = __importDefault(require("zlib"));
var ws_1 = __importDefault(require("ws"));
var net_1 = __importDefault(require("net"));
var cron_1 = __importDefault(require("cron"));
var ioredis_1 = __importDefault(require("ioredis"));
var events_1 = require("events");
var buffer_xor_1 = __importDefault(require("buffer-xor"));
var request_1 = __importDefault(require("request"));
var querystring_1 = __importDefault(require("querystring"));
var crypto_1 = __importDefault(require("crypto"));
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
    /**触发任务 */
    PackeType[PackeType["emitjob"] = 7] = "emitjob";
    /**同步事件主机ID */
    PackeType[PackeType["asyncjobserverid"] = 8] = "asyncjobserverid";
    /**上线 */
    PackeType[PackeType["online"] = 9] = "online";
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
var __index__ = 0;
var id24_buffer = Buffer.alloc(16);
var Utils = {
    /**
     * 获取一个 24 位的ID
     * - 进程ID + 时间戳后 6 位 + 6 位序列号 + 随机数后 6 位
     * - 经测试 100W 次运行中，没有发现重复ID
     */
    get ID24() {
        var offset = 0;
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
    HTTPPost: function (url, data, headers, key) {
        var _this = this;
        if (data === void 0) { data = {}; }
        if (headers === void 0) { headers = {}; }
        return new Promise(function (resolve, reject) {
            url += (url.includes("?") ? "&" : "?") + querystring_1.default.stringify({ t: Date.now() });
            data.sign = _this.MD5(JSON.stringify(data), key);
            request_1.default({
                method: 'POST',
                url: url,
                headers: Object.assign({
                    'Content-Type': 'application/x-www-form-urlencoded'
                }, headers),
                json: true,
                form: { data: Utils.XOREncoder(data, key) }
            }, function (error, response, body) {
                if (error) {
                    console.error("HTTPPost-response", { url: url, error: error });
                    return reject(error);
                }
                var res = Utils.XORDecoder(body.data, key);
                resolve(res);
            });
        });
    },
    /**
     * MD5
     * @param str
     */
    MD5: function (str, key) {
        return crypto_1.default.createHash('md5').update(str + key).digest('hex');
    },
    XOREncoder: function (a, key) {
        try {
            return buffer_xor_1.default(typeof (a) === "string" ? Buffer.from(a) : Buffer.from(JSON.stringify(a)), Buffer.from(key)).toString("base64");
        }
        catch (error) {
            console.error(error);
            return a;
        }
    },
    XORDecoder: function (a, key) {
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
    CodeEncoder: function (_type, _data) {
        var type = Buffer.alloc(1);
        type.writeUInt8(+_type);
        switch (_type) {
            case PackeType.heartbeat: {
                // let buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(Date.now());
                return Buffer.concat([type /* , buffer */]);
            }
            case PackeType.shakehands: {
                var id = Buffer.from(_data.id || "");
                var data = Buffer.from(JSON.stringify(_data.data || ""));
                var ack = Buffer.alloc(1);
                ack.writeUInt8(+_data.ack);
                var idlength = Buffer.alloc(4);
                idlength.writeInt32BE(id.length);
                var data_length = Buffer.alloc(4);
                data_length.writeUInt32BE(data.length);
                return Buffer.concat([type, ack, idlength, id, data_length, data]);
            }
            case PackeType.asyncserverlist: {
                var size = Buffer.alloc(4);
                size.writeUInt32BE(_data.length);
                var list = [];
                for (var _i = 0, _data_1 = _data; _i < _data_1.length; _i++) {
                    var _a = _data_1[_i], id1 = _a.id1, ip1 = _a.ip1, port1 = _a.port1;
                    var id = Buffer.from(id1);
                    var idlength = Buffer.alloc(4);
                    idlength.writeUInt32BE(id.length);
                    var ip = Buffer.from(ip1);
                    var iplength = Buffer.alloc(4);
                    iplength.writeUInt32BE(ip.length);
                    var port = Buffer.alloc(4);
                    port.writeUInt32BE(+port1);
                    list.push(Buffer.concat([idlength, id, iplength, ip, port]));
                }
                return Buffer.concat([type, size].concat(list));
            }
            case PackeType.online: {
                var id = Buffer.from(_data.id);
                var idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                var ip = Buffer.from(_data.ip);
                var iplength = Buffer.alloc(4);
                iplength.writeUInt32BE(ip.length);
                var port = Buffer.alloc(4);
                port.writeUInt32BE(+_data.port);
                return Buffer.concat([type, idlength, id, iplength, ip, port]);
            }
            case PackeType.asyncevents: {
                var events = [].concat(_data);
                var length_1 = Buffer.alloc(4);
                length_1.writeUInt32BE(events.length);
                var buffers = events.map(function (name) {
                    var d = Buffer.from(name + "");
                    var l = Buffer.alloc(4);
                    l.writeUInt32BE(d.length);
                    return Buffer.concat([l, d]);
                });
                return Buffer.concat([type, length_1].concat(buffers));
            }
            case PackeType.asyncjob: {
                var crontime = Buffer.from(_data.crontime);
                var cmd = Buffer.from(_data.cmd);
                var content = Buffer.from(JSON.stringify(_data.content));
                var cronlength = Buffer.alloc(4);
                cronlength.writeUInt32BE(crontime.length);
                var cmdlength = Buffer.alloc(4);
                cmdlength.writeUInt32BE(cmd.length);
                var contentlength = Buffer.alloc(4);
                contentlength.writeUInt32BE(content.length);
                return Buffer.concat([type, cronlength, crontime, cmdlength, cmd, contentlength, content]);
            }
            case PackeType.emitjob: {
                var cmd = Buffer.from(_data.cmd);
                var cmdlength = Buffer.alloc(4);
                cmdlength.writeUInt32BE(cmd.length);
                return Buffer.concat([type, cmdlength, cmd]);
            }
            case PackeType.emitevent: {
                var event_1 = Buffer.from(_data.event);
                var eventLength = Buffer.alloc(4);
                eventLength.writeUInt32BE(event_1.length);
                var args = Buffer.from(JSON.stringify(_data.args));
                var argslength = Buffer.alloc(4);
                argslength.writeUInt32BE(args.length);
                return Buffer.concat([type, eventLength, event_1, argslength, args]);
            }
            case PackeType.asyncjobserverid: {
                var id = Buffer.from(_data || "");
                var idlength = Buffer.alloc(4);
                idlength.writeUInt32BE(id.length);
                return Buffer.concat([type, idlength, id]);
            }
            default: {
                throw new Error("not found packet type: " + _type);
            }
        }
    },
    /**
     *
     * @param buffer
     */
    CodeDecoder: function (buffer) {
        var offset = 0;
        var type = buffer.readUInt8(offset++);
        switch (type) {
            case PackeType.shakehands: {
                var ack = buffer.readUInt8(offset++);
                var idlength = buffer.readUInt32BE(offset);
                offset += 4;
                var id = buffer.slice(offset, offset += idlength).toString();
                var datalength = buffer.readUInt32BE(offset);
                offset += 4;
                var dataStr = buffer.slice(offset, offset += datalength).toString();
                var data = JSON.parse(dataStr);
                return { type: type, id: id, ack: ack, data: data };
            }
            case PackeType.heartbeat: {
                // let data = buffer.readBigUInt64BE(offset++);
                return { type: type /* , data */ };
            }
            case PackeType.asyncserverlist: {
                var size = buffer.readUInt32BE(offset);
                offset += 4;
                var servers = [];
                for (var i = 0; i < size; i++) {
                    var idlength = buffer.readUInt32BE(offset);
                    offset += 4;
                    var id = buffer.slice(offset, offset += idlength).toString();
                    var iplength = buffer.readUInt32BE(offset);
                    offset += 4;
                    var ip = buffer.slice(offset, offset += iplength).toString();
                    var port = buffer.readUInt32BE(offset);
                    servers.push({ id: id, ip: ip, port: port });
                }
                return { type: type, servers: servers };
            }
            case PackeType.online: {
                var idlength = buffer.readUInt32BE(offset);
                offset += 4;
                var id = buffer.slice(offset, offset += idlength).toString();
                var iplength = buffer.readUInt32BE(offset);
                offset += 4;
                var ip = buffer.slice(offset, offset += iplength).toString();
                var port = buffer.readUInt32BE(offset);
                return { type: type, id: id, ip: ip, port: port };
            }
            case PackeType.asyncevents: {
                var length_2 = buffer.readUInt32BE(offset);
                offset += 4;
                var events = [];
                for (var i = 0; i < length_2; i++) {
                    var nameLength = buffer.readUInt32BE(offset);
                    offset += 4;
                    var name_1 = buffer.slice(offset, offset += nameLength).toString();
                    events.push(name_1);
                }
                return { type: type, events: events };
            }
            case PackeType.emitevent: {
                var eventnamelength = buffer.readUInt32BE(offset);
                offset += 4;
                var eventname = buffer.slice(offset, offset += eventnamelength).toString();
                var argslength = buffer.readUInt32BE(offset);
                offset += 4;
                var argsStr = buffer.slice(offset, offset += argslength).toString();
                var args = JSON.parse(argsStr);
                return { type: type, eventname: eventname, args: args };
            }
            case PackeType.asyncjob: {
                var cronlength = buffer.readUInt32BE(offset);
                offset += 4;
                var crontime = buffer.slice(offset, offset += cronlength).toString();
                var cmdlength = buffer.readUInt32BE(offset);
                offset += 4;
                var cmd = buffer.slice(offset, offset += cmdlength).toString();
                var contentlength = buffer.readUInt32BE(offset);
                offset += 4;
                var contentStr = buffer.slice(offset, offset += contentlength).toString();
                var content = JSON.parse(contentStr);
                return { type: type, crontime: crontime, cmd: cmd, content: content };
            }
            case PackeType.emitjob: {
                var cmdlength = buffer.readUInt32BE(offset);
                offset += 4;
                var cmd = buffer.slice(offset, offset += cmdlength).toString();
                return { type: type, cmd: cmd };
            }
            case PackeType.asyncjobserverid: {
                var idlength = buffer.readUInt32BE(offset);
                offset += 4;
                var id = buffer.slice(offset, offset += idlength).toString();
                return { type: type, id: id };
            }
        }
        return { type: type };
    }
};
var Connection = /** @class */ (function (_super) {
    __extends(Connection, _super);
    function Connection() {
        var _this = _super.call(this, null) || this;
        _this.status = Shakehands.start;
        _this.id = "";
        _this.events = new Set();
        _this.on("message", function (buffer) {
            if (Buffer.isBuffer(buffer)) {
                if (buffer.length > 2 && buffer.slice(0, 2).readUInt16BE() == 0x8b1f)
                    buffer = zlib_1.default.gunzipSync(buffer);
                var packet = Utils.CodeDecoder(buffer);
                if (PackeType.heartbeat === packet.type) {
                    setTimeout(_this.sendPing.bind(_this), 1000);
                    _this.emit("pong", packet.data);
                }
                else if (PackeType.shakehands === packet.type) {
                    var ack = packet.ack, id = packet.id || "", data = packet.data;
                    if (Shakehands.start === ack) {
                        _this.id = id;
                        _this.sendShakehands(Shakehands.progress, id);
                    }
                    else if (Shakehands.progress === ack) {
                        _this.sendShakehands(Shakehands.end);
                    }
                    else if (Shakehands.end === ack) {
                        _this.sendShakehands(Shakehands.end);
                        _this.emit("open");
                    }
                }
                _this.emit("data", _this.id, packet);
            }
            else
                _this.emit("data", _this.id, buffer);
        });
        return _this;
    }
    /**
     * 发送数据包
     * @param {*} type
     * @param {*} data
     */
    Connection.prototype.sendPacket = function (type, data) {
        if (this.readyState === this.OPEN) {
            var packet = Utils.CodeEncoder(type, data);
            if (packet.length > 128)
                packet = zlib_1.default.gzipSync(packet);
            this.send(packet, { mask: true, binary: true });
        }
    };
    /**
     * 发送握手包
     * @param {*} ack
     * @param {*} data
     */
    Connection.prototype.sendShakehands = function (ack, id, data) {
        if (id === void 0) { id = this.id; }
        if (data === void 0) { data = {}; }
        if (this.status !== Shakehands.end) {
            this.sendPacket(PackeType.shakehands, { ack: ack, id: id, data: data });
        }
        this.status = ack;
    };
    /**发送心跳包 */
    Connection.prototype.sendPing = function () {
        this.sendPacket(PackeType.heartbeat);
        this.emit("ping");
    };
    /**
     * 发送服务器列表
     * @param {*} servers
     */
    Connection.prototype.sendServers = function (servers) {
        this.sendPacket(PackeType.online, servers);
    };
    /**
     * 发送上线通知
     * @param {*} id
     * @param {*} ip
     * @param {*} port
     */
    Connection.prototype.sendOnline = function (id, ip, port) {
        this.sendPacket(PackeType.online, { id: id, ip: ip, port: port });
    };
    /**
     * 同步事件
     * @param {*} eventNames
     */
    Connection.prototype.sendSyncevents = function (eventNames) {
        this.sendPacket(PackeType.asyncevents, eventNames);
    };
    /**
     * 同步指令任务
     * @param {*} crontime
     * @param {*} cmd
     * @param {*} args
     */
    Connection.prototype.sendSyncjob = function (crontime, cmd, args) {
        this.sendPacket(PackeType.asyncjob, { crontime: crontime, cmd: cmd, content: args });
    };
    /**
     * 同步事件执行
     * @param {*} event
     * @param {*} args
     */
    Connection.prototype.sendEmitevent = function (event, args) {
        this.sendPacket(PackeType.emitevent, { event: event, args: args });
    };
    /**
     * 执行指令任务
     * @param {*} cmd
     */
    Connection.prototype.sendEmitjob = function (cmd) {
        this.sendPacket(PackeType.emitjob, { cmd: cmd });
    };
    /**
     * 同步时间服务器ID
     * @param {*} id
     */
    Connection.prototype.sendSyncjobserverid = function (id) {
        this.sendPacket(PackeType.asyncjobserverid, id);
    };
    return Connection;
}(ws_1.default));
var ClientConn = /** @class */ (function (_super) {
    __extends(ClientConn, _super);
    function ClientConn(id, ip, port) {
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.ip = ip;
        _this.port = port;
        _this.reconnectionCount = 20;
        _this.connect();
        _this.on("close", function (_) {
            _this.status = Shakehands.notstart;
            setTimeout(_this.reconnection.bind(_this), 1000);
        });
        return _this;
    }
    ClientConn.prototype.reconnection = function () {
        if (this.status === Shakehands.notstart && --this.reconnectionCount) {
            this.connect();
            console.log("发起重连", this.id);
        }
    };
    ClientConn.prototype.connect = function () {
        var _this = this;
        this.status = Shakehands.notstart;
        var socket = net_1.default.connect(this.port, this.ip, function () {
            _this.reconnectionCount = 20;
            _this.status = Shakehands.start;
            _this.setSocket(socket, [], 0);
        });
        socket.on("error", function (_) {
            if (_this.status === Shakehands.notstart)
                _this.emit("close");
        });
    };
    return ClientConn;
}(Connection));
var ServerConn = /** @class */ (function (_super) {
    __extends(ServerConn, _super);
    function ServerConn(socket) {
        var _this = _super.call(this) || this;
        _this.setSocket(socket, [], 0);
        return _this;
    }
    return ServerConn;
}(Connection));
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
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Utils.HTTPPost(url, { username: username, password: password, id: id, ip: ip, port: port }, {}, key)];
        });
    });
}
var SServer = /** @class */ (function (_super) {
    __extends(SServer, _super);
    function SServer(config) {
        var _this = _super.call(this) || this;
        _this.config = config;
        _this.id = Utils.ID24;
        _this.SNodes = {};
        _this.SNodeList = [];
        _this.CNodes = {};
        _this.CNodeList = [];
        _this.redis = null;
        _this.jobServerKey = "";
        _this.jobServerId = "";
        _this.cmdjobs = {};
        _this.cronjobs = {};
        _this.server = net_1.default.createServer(function (socket) {
            var client = new ServerConn(socket);
            client.on("close", function (_) { _this.closeNode(client.id); });
            client.on("data", _this.onmessage.bind(_this));
            client.on("open", function () {
                client.sendSyncevents(_this.eventNames());
                client.sendSyncjobserverid(_this.jobServerId);
                for (var _i = 0, _a = Object.values(_this.cronjobs); _i < _a.length; _i++) {
                    var _b = _a[_i], crontime = _b.crontime, cmd = _b.cmd, args = _b.args;
                    client.sendSyncjob(crontime, cmd, args);
                }
                _this.SNodeList.push(_this.SNodes[client.id] = client);
                console.log("createServer", client.id, Object.keys(_this.CNodes), Object.keys(_this.SNodes));
            });
        });
        return _this;
    }
    SServer.prototype.on = function (event, fn) {
        _super.prototype.on.call(this, event, fn);
        for (var _i = 0, _a = this.CNodeList; _i < _a.length; _i++) {
            var client = _a[_i];
            client.sendSyncevents([event]);
        }
        return this;
    };
    SServer.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        for (var _a = 0, _b = this.CNodeList.filter(function (c) { return c.events.has(event); }); _a < _b.length; _a++) {
            var client = _b[_a];
            client.sendEmitevent(event, args);
        }
        return _super.prototype.emit.apply(this, __spreadArray([event], args));
        ;
    };
    SServer.prototype.connectNode = function (ip, port, isNotice) {
        var _this = this;
        if (isNotice === void 0) { isNotice = true; }
        try {
            var client_1 = new ClientConn(Utils.MD5(this.id + "-" + ip + "-" + port, this.config.signKey), ip, port);
            client_1.on("close", function (_) { _this.closeNode(client_1.id); });
            client_1.on("data", this.onmessage.bind(this));
            client_1.on("open", function () {
                _this.CNodeList.push(_this.CNodes[client_1.id] = client_1);
                client_1.sendPing();
                client_1.sendShakehands(Shakehands.start, client_1.id);
                isNotice && client_1.sendOnline(_this.id, _this.config.ip, _this.config.port);
                console.log("createNodeClient2", Object.keys(_this.CNodes), Object.keys(_this.SNodes));
            });
        }
        catch (error) {
            console.error("connectNode", error);
        }
    };
    SServer.prototype.startJobasync = function () {
        if (this.jobServerId === this.id) {
            for (var cmd in this.cronjobs) {
                var task = this.cronjobs[cmd];
                task.start();
            }
        }
    };
    SServer.prototype.job = function (crontime, cmd) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        for (var _a = 0, _b = this.CNodeList; _a < _b.length; _a++) {
            var client = _b[_a];
            client.sendSyncjob(crontime, cmd, args);
        }
        this.addCronJon.apply(this, __spreadArray([crontime, cmd], args));
    };
    SServer.prototype.execCmd = function (cmd) {
        try {
            var client = __spreadArray([0], this.CNodeList).sort(function (_) { return Math.random() - .5; }).pop();
            if (client instanceof ClientConn)
                client.sendEmitjob(cmd);
            else
                this.onmessage(this.id, { type: PackeType.emitjob, cmd: cmd });
        }
        catch (error) {
            console.error("addCronJon-执行报错", error);
        }
    };
    SServer.prototype.addCronJon = function (crontime, cmd) {
        var _this = this;
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (this.cronjobs[cmd])
            return;
        var task = cron_1.default.job(crontime, function () { _this.execCmd(cmd); });
        if (this.jobServerId === this.id)
            task.start();
        task.crontime = crontime;
        task.cmd = cmd;
        task.args = args;
        this.cronjobs[cmd] = task;
    };
    SServer.prototype.setCmdJobs = function (cmds) {
        this.cmdjobs = cmds;
    };
    SServer.prototype.onmessage = function (id, message) {
        return __awaiter(this, void 0, void 0, function () {
            var crontime, cmd, args, task, job, _i, _a, name_2, eventname, args, cid, _b, _c, client;
            return __generator(this, function (_d) {
                switch (message.type) {
                    case PackeType.asyncjobserverid: {
                        this.jobServerId = message.id;
                        break;
                    }
                    case PackeType.asyncjob: {
                        crontime = message.crontime, cmd = message.cmd, args = message.content;
                        this.addCronJon.apply(this, __spreadArray([crontime, cmd], args));
                        break;
                    }
                    case PackeType.emitjob: {
                        try {
                            task = this.cronjobs[message.cmd];
                            job = this.cmdjobs[message.cmd];
                            if (task && job instanceof Function)
                                Promise.resolve(job.apply(this.cmdjobs, task.args));
                        }
                        catch (error) {
                            console.error("onmessage", error);
                        }
                        break;
                    }
                    case PackeType.asyncevents: {
                        for (_i = 0, _a = message.events; _i < _a.length; _i++) {
                            name_2 = _a[_i];
                            this.CNodes[id].events.add(name_2);
                        }
                        break;
                    }
                    case PackeType.emitevent: {
                        eventname = message.eventname, args = message.args;
                        _super.prototype.emit.apply(this, __spreadArray([eventname], args));
                        break;
                    }
                    case PackeType.online: {
                        cid = this.id + "-" + message.port;
                        if (this.SNodes[id]) {
                            if (!this.CNodes[cid]) {
                                this.connectNode(message.ip, message.port, false);
                                for (_b = 0, _c = this.SNodeList; _b < _c.length; _b++) {
                                    client = _c[_b];
                                    if (client.id != id)
                                        client.sendOnline(message.id, message.ip, message.port);
                                }
                            }
                            console.log("S", this.id, id, Object.keys(this.CNodes), Object.keys(this.SNodes), message);
                        }
                        else if (this.CNodes[id]) {
                            if (!this.CNodes[cid]) {
                                this.connectNode(message.ip, message.port);
                            }
                            console.log("C", this.id, id, Object.keys(this.CNodes), Object.keys(this.SNodes), message);
                        }
                        break;
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    SServer.prototype.closeNode = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var i, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.CNodes[id]) {
                            delete this.CNodes[id];
                            i = this.CNodeList.findIndex(function (c) { return c.id === id; });
                            if (this.CNodeList[i])
                                this.CNodeList.splice(i, 1);
                        }
                        if (this.SNodes[id]) {
                            delete this.SNodes[id];
                            i = this.SNodeList.findIndex(function (c) { return c.id === id; });
                            if (this.SNodeList[i])
                                this.SNodeList.splice(i, 1);
                        }
                        if (!(this.jobServerId === id)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.redis.del(this.jobServerKey)];
                    case 1:
                        _a.sent();
                        this.vieJobServer();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    SServer.prototype.vieJobServer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var lock, _i, _a, client;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.redis.exists(this.jobServerKey)];
                    case 1:
                        if (_b.sent())
                            return [2 /*return*/];
                        return [4 /*yield*/, this.redis.set(this.jobServerKey + "_lock", 1, "ex", 1, "nx")];
                    case 2:
                        lock = _b.sent();
                        if (!lock) return [3 /*break*/, 4];
                        console.log("夺得任务服务器执行权");
                        return [4 /*yield*/, this.redis.set(this.jobServerKey, this.jobServerId = this.id)];
                    case 3:
                        _b.sent();
                        this.startJobasync();
                        for (_i = 0, _a = this.CNodeList; _i < _a.length; _i++) {
                            client = _a[_i];
                            client.sendSyncjobserverid(client.id);
                        }
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SServer.prototype.start = function (cb) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, ip, port, id, jobServerKey, redis;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, requestNetworkAccess(this.config.centralUrl, this.config.username, this.config.password, this.id, this.config.ip, this.config.port, this.config.signKey)];
                    case 1:
                        _a = _b.sent(), ip = _a.ip, port = _a.port, id = _a.id, jobServerKey = _a.jobServerKey, redis = _a.redis;
                        this.jobServerKey = jobServerKey;
                        this.redis = new ioredis_1.default(redis);
                        if (redis.password)
                            this.redis.auth(redis.password).then(function (_) { return console.log("redis", "auth successfully"); });
                        this.server.listen(this.config.port, function () {
                            if (ip && id !== _this.id)
                                _this.connectNode(ip, port);
                            _this.vieJobServer();
                            cb && cb();
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return SServer;
}(events_1.EventEmitter));
module.exports = SServer;
