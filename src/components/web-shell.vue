<template>
    <div style="width: 100%; height:100%;">
        <div id="xtermcontent" ref="terminal" style="height:100%; width: 100%"></div>
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
            this.socket.close();
        }
        this.term?.dispose();
        window.removeEventListener('resize', this.resize);
    },
    mounted(){
        setTimeout(()=>{
            let ele = document.getElementById('xtermcontent');
            this.initTerm();
            this.initSocket();
        },300)
    },
    methods: {
        initSocket(callback){
            this.ready = false;

            if(!this.socketUrl){return}
            if(this.socket){this.socket.close();}

            let baseURL = '';
            if(window.__MICRO_APP_ENVIRONMENT__){
                baseURL = window?.microApp?.getData()?.requestUrl || '';
            }
            let command = '';
            if(this.origin=='nodes'){
                let str = 'nsenter -t 1 --mount --uts --ipc --net --pid --';
                str.split(' ').forEach((item)=>{
                    command = command + `&command=${item}`;
                })
                command = command + `&command=/${this.type||'bin/sh'}`;
            }else if(this.defaultCommand){
                this.defaultCommand.split(' ').forEach(item=>{
                    command = command + `&command=${item}`;
                })
            }else{
                command = command + `&command=/${this.type||'bin/sh'}`;
            }
            console.log(command)

            let src = '';
            if(this.origin=='nodes'){
                src = `${baseURL.replace(/\/$/,'')}/panel-api/v1/nodetty?hostIp=${this.ip}&api-token=${this.api_token}&shell=${this.type||'bin/sh'}`;
            }else{
                src = `${baseURL.replace(/\/$/,'')}${this.socketUrl}?podName=${this.pod}&namespace=${this.namespace}&containerName=${this.containerName}${command}&tty=true&api-token=${this.token}`;
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
            window.addEventListener('resize', () => {
                if(this.show===false){return}
                fitAddon.fit();
                // let xv = document.querySelector('#xtermcontent .xterm-viewport');
                // xv && (xv.style.width = 'auto');
            });
            
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