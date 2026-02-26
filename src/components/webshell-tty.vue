<template>
    <div id="xtermcontent" ref="terminal" style="height:100%; width: 100%"></div>
</template>

<script>
// import {Terminal} from 'xterm';
// import 'xterm/css/xterm.css';

import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {FitAddon} from '@xterm/addon-fit';

import { AdventureTime } from 'xterm-theme';

export default {
    props: ['token','command','show','type'],
    data(){
        return {
            socketUrl: '/panel-api/v1/tty',
            socket: null,
            socketClose: false,
            term: null,
            xtermfit: null,
            ready: false,
            decoder: null,
            // token: '',
            firstMessage: true,
        }
    },
    created(){
        // this.token = this.$route.query.token;
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
            this.socket = new WebSocket(`${baseURL.replace(/\/$/,'')}${this.socketUrl}?api-token=${this.token}&command=${this.type||'/bin/sh'}&tty=true`);
            this.socket.onopen = () => {
                this.socketClose = false;
                this.messageSocket();
                this.colrows(this.term.rows,this.term.cols);
            }

        },
        initTerm(){
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
            fitAddon.fit();
            window.addEventListener('resize', () => {
                if(this.show===false){return}
                fitAddon.fit();
            });
            
            term.onResize((size) => {
                this.colrows(size.rows, size.cols);
            });
            term.focus();
            this.term = term;
            
        },
        colrows(rows,cols){
            const buffer = new ArrayBuffer(4); // 2 bytes per number, total 4 bytes  
            const view = new Uint16Array(buffer);
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
                
                if(this.command && this.firstMessage){
                    this.firstMessage = false;
                    this.sendData(this.command);
                }
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