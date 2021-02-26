class Uploader {

    constructor({file, onProgress}) {
        this.file = file;
        this.onProgress = onProgress;
        this.chunksize =  1024 * 1024; // 1MB
        this.chunks = 0;
        this.startByte = 0;
        this.start = 0;
        this.end = 0;
        this.fileId = file.name + '-' + file.size + '-' + +file.lastModifiedDate;
    }

    calculateProgress(string = false)
    {
        let progress = (this.start / this.file.size) * 100;
        progress = progress.toFixed(2);
        if (string) {
            progress += '%';
        }
        return progress;
    }

    async calculateChunks() {
        let uploadedData = await this.getUploadedBytes();
        let fileSize = this.file.size - uploadedData.size;
        this.chunks = Math.ceil(fileSize / this.chunksize);
        this.startByte = uploadedData.size;
    }

    async getChunks() {
        await this.calculateChunks()
        return this.chunks;
    }

    async getUploadedBytes() {
        let response = await fetch('/upload.php?action=status', {
            headers: {
                'X-File-Id': this.fileId
            }
        });

        if (response.status != 200) {
            throw new Error("Can't get uploaded bytes: " + response.statusText);
        }

        let text = await response.text();
        let data = JSON.parse(text);
        return data;
    }

    async uploadChunk(chunk = 0)
    {
        var xhr = new XMLHttpRequest();

        this.start = this.startByte + (this.chunksize * chunk);
        this.end = this.start + (this.chunksize);
        if (this.end >= this.file.size) {
            this.end = this.file.size;
        }

        xhr.upload.onprogress = (e) => {
            this.onProgress(this.end, this.file.size, chunk, this.chunks, this.calculateProgress(true), this.calculateProgress(true));
        };

        xhr.open(
            "POST",
            "upload.php?action=upload",
            true
        );
        xhr.setRequestHeader("Cache-Control", "no-cache");
        xhr.setRequestHeader('X-File-Id', this.fileId);
        xhr.setRequestHeader("X-File-Name", this.file.name);
        xhr.setRequestHeader("X-File-Size", this.file.size);
        xhr.setRequestHeader("X-File-Type", this.file.type);
        xhr.setRequestHeader("Content-Range", this.start+"-"+this.end+"/"+this.file.size);
        xhr.send(this.file.slice(this.start, this.end));

        return await new Promise((resolve, reject) => {

            xhr.onload = xhr.onerror = () => {
                console.log("upload end status:" + xhr.status + " text:" + xhr.statusText);

                if (xhr.status == 200) {
                    resolve(true);
                } else {
                    reject(new Error("Upload failed: " + xhr.statusText));
                }
            };

        });
    }
}

function onProgress(loaded, total, currentChunk, totalChunks, progressString, progressInt) {
    setProgress(calculateProgress(loaded, total));
}

function setProgress(progress)
{
    let progressText = progress === 100 ? '100%' : progress.toFixed(2) + '%';
    let progressBar = $('.progress-bar');
    progressBar.width(progressText);
    progressBar.text(progressText);
}

function calculateProgress(size, totalSize)
{
    return (size / totalSize) * 100;
}

document.forms.upload.onsubmit = async function(e) {
    e.preventDefault();

    let file = this.elements.file.files[0];
    if (!file) return;

    let uploader = new Uploader({file, onProgress});

    let chunks = await uploader.getChunks();

    setProgress(calculateProgress(uploader.startByte, uploader.file.size));

    try {
        for(c = 0; c < chunks; c++) {
            await uploader.uploadChunk(c);
        }
    } catch(err) {
        console.error(err);
    }
};