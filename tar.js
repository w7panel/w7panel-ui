const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const ProgressBar = require('progress');

// 设置要压缩的目录和输出文件
const sourceDir = 'node_modules';
const outputFile = 'node_modules.tar';

// 创建一个可写流，用于写入压缩文件
const output = fs.createWriteStream(outputFile);
const archive = archiver('tar', {
  gzip: true, // 使用 gzip 压缩
  zlib: { level: 9 } // 设置压缩级别
});

// 获取目录大小
function getDirectorySize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stat.size;
    }
  });
  return size;
}

const totalSize = getDirectorySize(sourceDir);
let processedSize = 0;

// 创建进度条
const bar = new ProgressBar('压缩进度 [:bar] :percent :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: totalSize
});

// 更新进度条
archive.on('entry', function(data) {
  processedSize += data.stats.size;
  bar.tick(data.stats.size);
});

// 将输出流与归档流连接
output.on('close', function() {
  console.log(`${archive.pointer()} total bytes`);
  console.log('压缩完成，文件已保存为 ' + outputFile);
});

// 捕获归档警告
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

// 捕获归档错误
archive.on('error', function(err) {
  throw err;
});

// 将归档流通过管道传输到输出流
archive.pipe(output);

// 递归添加目录中的所有文件和子目录到归档
function addDirectoryToArchive(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      addDirectoryToArchive(filePath);
    } else {
      archive.file(filePath, { name: path.relative(sourceDir, filePath) });
    }
  });
}

addDirectoryToArchive(sourceDir);

// 完成归档
archive.finalize();
