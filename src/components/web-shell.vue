<template>
    <div style="width: 100%; height:100%;">
        <div ref="terminal" style="height:100%; width: 100%"></div>
        <!-- <iframe id="term" src="/testxterm.html" style="height:100%; width: 100%; border: 0" border=0></iframe> -->
    </div>
   
    <!-- <button @click="fit()">resize</button> -->
</template>

<script>
// import {Terminal} from 'xterm';
// import 'xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {FitAddon} from '@xterm/addon-fit';
import { getToken } from '@/utils/auth';
import { AdventureTime } from 'xterm-theme';

export default {
    props: ['api_token','type','pod','defaultCommand','namespace','containerName','show','origin','ip'],
    data(){
        return {
            socketUrl: '/panel-api/v1/exec',
            socket: null,
            socketClose: false,
            term: null,
            xtermfit: null,
            ready: false,
            decoder: null,
            token: '',
            resizeHandler: null,
        }
    },
    created(){
        this.token = getToken();
        if(this.api_token){
            this.token = this.api_token;
        }
    },
    beforeUnmount(){
        if(this.socket){
            try {
                if (!this.socketClose && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send('exit\n');
                }
            } catch (e) {
                console.error(e);
            }
            this.socket.close();
        }
        this.term?.dispose();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    },
    mounted(){
        setTimeout(()=>{
            this.initTerm();
            this.initSocket();
        },300)
    },
    methods: {
        normalizeShellPath(shell){
            const raw = String(shell || 'bin/sh').trim();
            const normalized = raw.replace(/^\/+/, '');
            if (normalized === 'bin/bash') return '/bin/bash';
            return '/bin/sh';
        },
        splitCommandArgs(command){
            const input = String(command || '').trim();
            if (!input) return [];
            const result = [];
            let current = '';
            let quote = '';
            let escape = false;
            for (let i = 0; i < input.length; i++) {
                const ch = input[i];
                if (escape) {
                    current += ch;
                    escape = false;
                    continue;
                }
                if (ch === '\\') {
                    escape = true;
                    continue;
                }
                if ((ch === '"' || ch === "'") && !quote) {
                    quote = ch;
                    continue;
                }
                if (ch === quote) {
                    quote = '';
                    continue;
                }
                if (!quote && /\s/.test(ch)) {
                    if (current) {
                        result.push(current);
                        current = '';
                    }
                    continue;
                }
                current += ch;
            }
            if (current) result.push(current);
            return result;
        },
        initSocket(callback){
            this.ready = false;

            if(!this.socketUrl){return}
            if(this.socket){this.socket.close();}

            let baseURL = '';
            if(window.__MICRO_APP_ENVIRONMENT__){
                baseURL = window?.microApp?.getData()?.requestUrl || '';
            }
            const shellPath = this.normalizeShellPath(this.type);
            const commandArgs = [];
            if(this.origin=='nodes'){
                // nodes 场景直接走 nodetty，不需要 command 参数
            }else if(this.defaultCommand){
                this.splitCommandArgs(this.defaultCommand).forEach((item) => {
                    commandArgs.push(item);
                });
            }else{
                commandArgs.push(shellPath);
            }

            let src = '';
            if(this.origin=='nodes'){
                const params = new URLSearchParams();
                params.set('hostIp', this.ip || '');
                params.set('api-token', this.token || '');
                params.set('shell', shellPath);
                src = `${baseURL.replace(/\/$/,'')}/panel-api/v1/nodetty?${params.toString()}`;
            }else{
                const params = new URLSearchParams();
                params.set('podName', this.pod || '');
                params.set('namespace', this.namespace || '');
                params.set('containerName', this.containerName || '');
                commandArgs.forEach((arg) => params.append('command', arg));
                params.set('tty', 'true');
                params.set('api-token', this.token || '');
                src = `${baseURL.replace(/\/$/,'')}${this.socketUrl}?${params.toString()}`;
            }
            this.socket = new WebSocket(src);
            // this.socket = new WebSocket("wss://iwd2s3pd-pfcthd7s-0dsjeiz8pcg0.c2.mcprev.cn/k8s/exec?podName=tradition-php-app-cfyqghij0a-66d4d6c8b9-vm7jd&namespace=default&containerName=app-cfyqghij0a&command=/bin/sh&tty=true");
            this.socket.onopen = () => {
                this.socketClose = false;
                this.messageSocket();
                this.colrows(this.term.rows,this.term.cols);
            }

        },
        initTerm(){
            const term = new Terminal({
                theme: AdventureTime,
                // cols: 122,
                // rows: 42,
                // cursorBlils
            });
            term.open(this.$refs["terminal"]);
            term.onData((data) => {
                this.sendData(data);
            });

            const fitAddon = new FitAddon()
            this.xtermfit = fitAddon;
            term.loadAddon(fitAddon);
            fitAddon.fit();
            this.resizeHandler = () => {
                if(this.show===false){return}
                fitAddon.fit();
                // let xv = document.querySelector('#xtermcontent .xterm-viewport');
                // xv && (xv.style.width = 'auto');
            };
            window.addEventListener('resize', this.resizeHandler);
            
            term.onResize((size) => {
                // console.log("resize")
                // console.log(size);
                // console.log("resize end")
                this.colrows(size.rows, size.cols);
            });
            term.focus();
            this.term = term;
            
        },
        colrows(rows,cols){
            const buffer = new ArrayBuffer(4); // 2 bytes per number, total 4 bytes  
            const view = new Uint16Array(buffer);
            // console.log(rows,cols)
            view[1] = cols;
            view[0] = rows;
            this.sendData(buffer);
        },
        sendData(message){
            if(!this.socket || this.socketClose){return}
            this.socket.send(message);
        },
        messageSocket() {
            this.socket.onmessage = (res) => {
                let data = res?.data;
                this.ready = true;
                this.term.write(data);
                return;
            }
            this.socket.onclose = ()=>{
                console.log('socket close')
                this.socketClose = true;
                this.socket = null;
            };
            this.socket.onerror = ()=>{
                console.log('socket error')
                this.socketClose = true;
            };
        },
    },
}
</script>

<style>

</style>
