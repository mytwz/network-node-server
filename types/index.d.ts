/// <reference types="node" />
import { EventEmitter } from "events";
declare type SConfig = {
    username: string;
    password: string;
    centralUrl: string;
    ip: string;
    port: number;
    signKey: string;
};
declare class SServer extends EventEmitter {
    private config;
    private id;
    private SNodes;
    private SNodeList;
    private CNodes;
    private CNodeList;
    private redis;
    private jobServerKey;
    private jobServerId;
    private cmdjobs;
    private cronjobs;
    private server;
    private keepKey;
    constructor(config: SConfig);
    on(event: string, fn: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    private SID;
    private connectNode;
    private startJobasync;
    job(crontime: string, cmd: string, ...args: any[]): void;
    private execCmd;
    private addCronJon;
    setCmdJobs(cmds: {
        [cmd: string]: Function;
    }): void;
    private onmessage;
    private closeNode;
    private vieJobServer;
    start(cb: Function): Promise<void>;
}
export = SServer;
