<template>
    <div style="height:100%; width: 100%; position: relative;">
        <div
            v-if="showReconnectHint"
            class="ws-status-bar"
        >
            <span class="ws-status-text">终端连接已中断（{{ disconnectReasonText }}），输入暂不可用</span>
            <a-button size="mini" type="primary" @click="manualReconnect">重新连接</a-button>
        </div>
        <div ref="terminal" style="height:100%; width: 100%"></div>
    </div>
</template>

<script>
// import {Terminal} from 'xterm';
// import 'xterm/css/xterm.css';

import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {FitAddon} from '@xterm/addon-fit';

import { AdventureTime } from 'xterm-theme';

export default {
    props: ['token','command','show','type','keepAliveOnHide'],
    data(){
        return {
            socketUrl: '/panel-api/v1/tty',
            socket: null,
            socketClose: false,
            manualClose: false,
            term: null,
            xtermfit: null,
            ready: false,
            decoder: null,
            // token: '',
            firstMessage: true,
            resizeHandler: null,
            reconnectTimer: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            reconnectDelayMs: 1500,
            heartbeatTimer: null,
            heartbeatIntervalMs: 25000,
            showReconnectHint: false,
            disconnectReasonText: '',
        }
    },
    created(){
        // this.token = this.$route.query.token;
        if(this.show===true&&this.socket===null){
            this.$nextTick(()=>{
                this.initTerm();
                this.initSocket();
            })
        }
    },
    watch: {
        show(v){
            if(v === false){
                if (this.keepAliveOnHide) return;
                this.closeSocketGracefully();
            } else if (v === true && this.socket) {
                this.refreshTerminalSize();
            } else if (v === true && !this.socket) {
                this.$nextTick(()=>{
                    if (!this.term) {
                        this.initTerm();
                    }
                    this.initSocket();
                })
            }
        }
    },
    beforeUnmount(){
        this.closeSocketGracefully();
        this.term?.dispose();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    },
    methods: {
        stopHeartbeat(){
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
        },
        startHeartbeat(){
            this.stopHeartbeat();
            this.heartbeatTimer = setInterval(() => {
                if (!this.socket || this.socketClose || this.socket.readyState !== WebSocket.OPEN) return;
                try {
                    this.socket.send('');
                } catch (e) {
                    console.error(e);
                }
            }, this.heartbeatIntervalMs);
        },
        clearReconnectTimer(){
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        },
        scheduleReconnect(){
            if (this.manualClose || this.show === false) return;
            this.showAbnormalDisconnectHint('连接异常中断');
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('webshell-tty reconnect exhausted');
                this.showAbnormalDisconnectHint('自动重连次数已耗尽');
                return;
            }
            this.clearReconnectTimer();
            this.reconnectAttempts += 1;
            this.reconnectTimer = setTimeout(() => {
                if (this.manualClose || this.show === false) return;
                this.initSocket();
            }, this.reconnectDelayMs);
        },
        showAbnormalDisconnectHint(reason){
            this.disconnectReasonText = reason || '连接中断';
            this.showReconnectHint = true;
        },
        clearAbnormalDisconnectHint(){
            this.disconnectReasonText = '';
            this.showReconnectHint = false;
        },
        manualReconnect(){
            if (this.show === false) return;
            this.clearReconnectTimer();
            this.stopHeartbeat();
            this.manualClose = false;
            this.socketClose = true;
            if (this.socket) {
                try { this.socket.close(); } catch (e) { console.error(e); }
                this.socket = null;
            }
            this.reconnectAttempts = 0;
            this.clearAbnormalDisconnectHint();
            this.term?.writeln('\r\n[WebShell] 正在手动重连...\r\n');
            this.initSocket();
        },
        closeSocketGracefully(){
            this.manualClose = true;
            this.stopHeartbeat();
            this.clearReconnectTimer();
            this.clearAbnormalDisconnectHint();
            if(this.socket){
                try {
                    if (!this.socketClose && this.socket.readyState === WebSocket.OPEN) {
                        this.socket.send('exit\n');
                    }
                } catch (e) {
                    console.error(e);
                }
                this.socket.close();
                this.socketClose = true;
                this.socket = null;
            }
        },
        normalizeShellPath(shell){
            const raw = String(shell || 'bin/sh').trim();
            const normalized = raw.replace(/^\/+/, '');
            if (normalized === 'bin/bash') return '/bin/bash';
            return '/bin/sh';
        },
        initSocket(callback){
            this.ready = false;
            this.manualClose = false;

            if(!this.socketUrl){return}
            if(this.socket){
                try { this.socket.close(); } catch (e) { console.error(e); }
            }
            
            let baseURL = '';
            if(window.__MICRO_APP_ENVIRONMENT__){
                baseURL = window?.microApp?.getData()?.requestUrl || '';
            }
            const shellPath = this.normalizeShellPath(this.type);
            const params = new URLSearchParams();
            params.set('api-token', this.token || '');
            params.set('shell', shellPath);
            this.socket = new WebSocket(`${baseURL.replace(/\/$/,'')}${this.socketUrl}?${params.toString()}`);
            this.socket.onopen = () => {
                this.socketClose = false;
                this.reconnectAttempts = 0;
                this.clearReconnectTimer();
                this.clearAbnormalDisconnectHint();
                this.messageSocket();
                this.colrows(this.term.rows,this.term.cols);
                this.startHeartbeat();
            }

        },
        initTerm(){
            if (this.term) {
                this.refreshTerminalSize();
                return;
            }
            const term = new Terminal({
                theme: AdventureTime,
            });
            term.open(this.$refs["terminal"]);
            term.onData((data) => {
                this.sendData(data);
            });

            const fitAddon = new FitAddon()
            this.xtermfit = fitAddon;
            term.loadAddon(fitAddon);
            this.resizeHandler = () => {
                if(this.show===false){return}
                this.refreshTerminalSize();
            };
            window.addEventListener('resize', this.resizeHandler);
            
            term.onResize((size) => {
                this.colrows(size.rows, size.cols);
            });
            term.focus();
            this.term = term;
            this.refreshTerminalSize();
            
        },
        refreshTerminalSize(){
            this.$nextTick(() => {
                window.requestAnimationFrame(() => {
                    if (!this.term || !this.xtermfit || this.show === false) return;
                    const el = this.$refs["terminal"];
                    if (!el || !el.offsetWidth || !el.offsetHeight) return;
                    try {
                        this.xtermfit.fit();
                        this.term.focus();
                    } catch (e) {
                        console.error(e);
                    }
                });
            });
        },
        colrows(rows,cols){
            const buffer = new ArrayBuffer(4); // 2 bytes per number, total 4 bytes  
            const view = new Uint16Array(buffer);
            view[1] = cols;
            view[0] = rows;
            this.sendData(buffer);
        },
        sendData(message){
            if(!this.socket || this.socketClose || this.socket.readyState !== WebSocket.OPEN){return}
            this.socket.send(message);
        },
        messageSocket() {
            this.socket.onmessage = (res) => {
                let data = res?.data;
                this.ready = true;
                this.term.write(data);
                
                if(this.command && this.firstMessage){
                    this.firstMessage = false;
                    this.sendData(this.command);
                }
                return;
            }
            this.socket.onclose = ()=>{
                console.log('socket close')
                this.stopHeartbeat();
                this.socketClose = true;
                this.socket = null;
                if (!this.manualClose) {
                    this.showAbnormalDisconnectHint('连接已关闭');
                    this.$message.warning('终端连接已断开，可点击“重新连接”恢复会话');
                    this.scheduleReconnect();
                }
            };
            this.socket.onerror = ()=>{
                console.log('socket error')
                this.stopHeartbeat();
                this.socketClose = true;
                this.socket = null;
                if (!this.manualClose) {
                    this.showAbnormalDisconnectHint('网络或后端异常');
                    this.$message.warning('终端连接异常，可点击“重新连接”恢复会话');
                    this.scheduleReconnect();
                }
            };
        },
    },
}
</script>

<style>
.ws-status-bar{
    position: absolute;
    z-index: 2;
    right: 12px;
    top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(255, 125, 0, 0.12);
    border: 1px solid rgba(255, 125, 0, 0.35);
}

.ws-status-text{
    font-size: 12px;
    color: #ff7d00;
}
</style>
