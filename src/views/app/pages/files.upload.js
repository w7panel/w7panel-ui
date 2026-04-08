import axios from 'axios';

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB 切片大小

function uploadChunk({url, chunk, index, total, random}) {
    
    var data = new FormData();
    data.append('file', chunk);
    data.append('chunkIndex', index);
    data.append('chunkTotal', total);
    data.append('identifier', random);
    
    return axios.post(url, data)
}

/**
 * 文件切片上传功能
 * @param {Object} context - Vue 组件实例
 */
export async function handleFileUpload(context) {
    const { form, upload, outEditorInfo, partPath } = context;
    const file = upload.file;

    context.upload.uploading = true;

    try {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const random = Math.random().toString(36).replace('0.','');

        // 分片上传
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            console.log('index: ', i, ', total: ', totalChunks)

            await uploadChunk({
                url: outEditorInfo.agentUrl + '/panel-api/v1/files/upload-chunk',
                chunk: chunk,
                index: i,
                total: totalChunks,
                random: random,
            });
            
        }

        await axios.post(outEditorInfo.agentUrl + '/panel-api/v1/files/merge-chunks',{
            totalChunks: totalChunks,
            identifier: random,
            pid: form.pid,
            subpid: form.subPid,
            fileName: partPath + upload.filename,
        })

        context.loading = false;
        if(context.upload?.noAlert!==true){
            context.$message.success('保存成功');
        }
        context.upload.show = false;
        context?.getFileList?.();
    } catch (error) {
        context.loading = false;
        console.error('上传失败', error);
        context.$message.error('保存失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    } finally {
        context.upload.uploading = false;
    }
}
