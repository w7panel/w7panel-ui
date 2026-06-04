<template>
    <div>
        <div v-if="focus=='name'" class="type">
            <div>
                <span class="title">请根据您选择的记录类型，按照格式要求填写记录值</span>
                <a href="https://cloud.tencent.com/document/product/302/105285" target="_blank" class="c-blue cursor">查看详细指引<icon-link class="ml-4" /></a>
            </div>
            <div class="detail mt-6">
                <div>
                    <span class="key">www</span>
                    <span class="item">常见主机记录，将域名解析为 www.{{ domain }}</span>
                </div>
                <div>
                    <span class="key">@</span>
                    <span class="item">直接解析主域名 {{ domain }}</span>
                </div>
                <div>
                    <span class="key">mail</span>
                    <span class="item">将域名解析为 mail.{{ domain }}，通常用于邮件服务</span>
                </div>
                <div>
                    <span class="key">*</span>
                    <span class="item">泛解析，匹配除@外的所有域名 *.{{ domain }}</span>
                </div>
            </div>
        </div>

        
        <div v-if="focus=='type'" class="type">
            <div>
                <span class="title">各个记录类型有不同的用途，一般选择 A 记录</span>
                <a href="https://cloud.tencent.com/document/product/302/38661" target="_blank" class="c-blue cursor">查看详细指引<icon-link class="ml-4" /></a>
            </div>
            <div class="detail mt-6">
                <div v-if="type=='A'||!type">
                    <span class="key">A</span>
                    <span class="item">A 记录是最常用类型，将域名指向一个 IPv4 地址，如 8.8.8.8</span>
                </div>
                <div v-if="type=='AAAA'||!type">
                    <span class="key">AAAA</span>
                    <span class="item">将域名指向一个 IPv6 地址，如 ff06:0:0:0:0:0:0:c3，需配置至少1条非默认线路AAAA记录</span>
                </div>
                <div v-if="type=='CNAME'||!type">
                    <span class="key">CNAME</span>
                    <span class="item">将域名指向另一个域名地址，与其保持相同解析，如 www.dnspod.cn</span>
                </div>
                <div v-if="type=='TXT'||!type">
                    <span class="key">TXT</span>
                    <span class="item">可填写附加文本信息，常用于域名验证</span>
                </div>
                <div v-if="type=='MX'||!type">
                    <span class="key">MX</span>
                    <span class="item">用于邮件服务器，相关参数一般由邮件注册商提供</span>
                </div>
                <div v-if="type=='NS'||!type">
                    <span class="key">NS</span>
                    <span class="item">域名服务器记录，可将指定域名交由其他 DNS 服务商解析管理</span>
                </div>
            </div>
        </div>

        
        <div v-if="focus=='value'" class="type">
            <div>
                <span class="title">请根据您选择的记录类型，按照格式要求填写记录值</span>
                <a href="https://cloud.tencent.com/document/product/302/3448" target="_blank" class="c-blue cursor">查看详细指引<icon-link class="ml-4" /></a>
            </div>
            <div class="detail mt-6">
                <div v-if="type=='A'||!type">
                    <span class="key">A</span>
                    <span class="item">您选择的是 A 记录，请在此填写服务器 IP 地址，如 8.8.8.8</span>
                </div>
                <div v-if="type=='AAAA'||!type">
                    <span class="key">AAAA</span>
                    <span class="item">您选择的是 AAAA 记录，请在此填写希望指向的 IPv6 地址，如 2400:da00::dbf:0:100</span>
                </div>
                <div v-if="type=='CNAME'||!type">
                    <span class="key">CNAME</span>
                    <span class="item">您选择的是 CNAME 记录，请在此填写希望指向的域名地址，例如 www.dnspod.cn. 域名结尾“.”表示根域，系统默认自动添加</span>
                </div>
                <div v-if="type=='TXT'||!type">
                    <span class="key">TXT</span>
                    <span class="item">您选择的是 TXT 记录，请在此填写需要标识的文本内容</span>
                </div>
                <div v-if="type=='MX'||!type">
                    <span class="key">MX</span>
                    <span class="item">您选择的是 MX 记录，请在此填写邮件服务器的域名或 IP 地址，一般由邮件注册商提供，域名结尾“.”表示根域，系统默认自动添加</span>
                </div>
                <div v-if="type=='NS'||!type">
                    <span class="key">NS</span>
                    <span class="item">您选择的是 NS 记录，请在此填写域名服务器地址，如 f1g1ns1.dnspod.net</span>
                </div>
            </div>
        </div>
        
        <div v-if="focus=='ttl'" class="type">
            <div>
                <span class="title">TTL 指解析记录在 DNS 服务器缓存的生存时间，数值越小则生效越快</span>
                <a href="https://cloud.tencent.com/document/product/302/9072" target="_blank" class="c-blue cursor">查看详细指引<icon-link class="ml-4" /></a>
            </div>
            <div class="detail mt-6">
                <div>
                    <span class="key">600</span>
                    <span class="item">一般默认值，如不了解请保留 600 秒即可</span>
                </div>
                <div>
                    <span class="key">3600</span>
                    <span class="item">当记录值较少变动时，建议选择 3600 秒，有利于提升解析速度</span>
                </div>
                <div>
                    <span class="key">60</span>
                    <span class="item">当记录值频繁变动，可选择 60 秒，但解析速度可能略受影响</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'ResolutionHelp',
    components: {},
    props: {
        focus: {
            default: 'name',
            type: String,
        },
        domain: {
            default: 'xxxx',
            type: String,
        },
        type: {
            default: '',
            type: String,
        }
    },
    data() {
        return {};
    },
    computed: {},
    watch: {},
    created() {},
    mounted() {},
    methods: {},
};
</script>

<style scoped>
.type{padding:0 10px;}
.title{ font-weight: bold; margin-right: 5px; font-size: 14px; }
.detail{font-size:12px;}
.detail .key{color: rgb(var(--primary-6)); display:inline-block; width:110px; padding:3px 10px;}
.detail .item{color: var(--color-text-3); padding:10px;}
</style>
