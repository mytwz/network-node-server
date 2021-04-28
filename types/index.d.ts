/// <reference types="node" />
import { EventEmitter } from "events";
/**服务配置 */
declare type SConfig = {
    /**入网用户名 */
    username: string;
    /**入网帐号密码 */
    password: string;
    /**中心服务地址 */
    centralUrl: string;
    /**本地网络Ip */
    ip: string;
    /**本地网络端口号 */
    port: number;
    /**与中心服务器通信的签名Key */
    signKey: string;
};
declare type CmdJobs = {
    [cmd: string]: Function;
};
declare class SServer extends EventEmitter {
    private config;
    /**主机ID  */
    private id;
    /**服务端连接列表 */
    private SNodes;
    /**服务端连接列表 */
    private SNodeList;
    /**客户端连接列表 */
    private CNodes;
    /**客户端连接列表 */
    private CNodeList;
    /**Redis 客户端连接 */
    private redis;
    /**定时任务服务器的标识 Key */
    private jobServerKey;
    /**定时任务服务器的ID  */
    private jobServerId;
    /**指令任务对象 */
    private cmdjobs;
    /**定时任务对象 */
    private cronjobs;
    /**本地 Socket 服务 */
    private server;
    /**服务缓存 Key */
    private keepKey;
    private clientConnQueue;
    private master;
    constructor(config: SConfig);
    /**
     * 绑定或者订阅事件
     * @param event 事件名称
     * @param fn 回调函数
     */
    on(event: string, fn: (...args: any[]) => void): this;
    /**
     * 执行绑定的网络事件
     * @param event 事件名称
     * @param args 携带参数
     */
    emit(event: string, ...args: any[]): boolean;
    /**
     * 生成客户端链接ID
     * @param ip
     * @param port
     * @requires MD5ID
     */
    private SID;
    /**
     * 连接网络节点
     * @param ip 远端主机IP
     * @param port 远端主机端口号
     * @param isNotice 是否广播其他主机连接此地址
     */
    private connectNode;
    /**
     *开始执行定时任务
     */
    private startJobasync;
    /**
     * 添加定时任务
     * @param crontime cron 时间参数
     * @param cmd 任务指令
     * @param args 携带参数
     * @requires 任务ID
     */
    job(crontime: string, cmd: string, ...args: any[]): string;
    /**
     * 移除定时任务
     * @param id
     */
    removeJob(id: string): void;
    /**
     * 执行定时任务
     * @param id 任务ID
     */
    execCmd(id: string): void;
    /**
     * 添加定时任务
     * @param id 任务ID
     * @param crontime cron 格式的时间参数
     * @param cmd 指令名称
     * @param args 携带参数
     */
    private addCronJon;
    /**
     * 设置任务指令
     * @param cmds 指令对象
     */
    setCmdJobs(cmds: CmdJobs): void;
    /**
     * 处理消息
     * @param id 链接ID
     * @param message 消息
     */
    private onmessage;
    /**
     * 主机断线
     * @param id 主机ID
     */
    private closeNode;
    /**
     * 争夺任务服务器的执行权限
     */
    private vieJobServer;
    /**
     * 启动服务
     * @param cb  启动回调
     */
    start(cb: Function): Promise<void>;
}
export = SServer;
