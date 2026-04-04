type UploadJob = {
  id: string;
  file: any;
  status: "pending" | "uploading" | "success" | "failed";
  result?: any;
  retries: number;
};

let queue: UploadJob[] = [];
let uploading = false;

export const initUploadManager = () => {
  processQueue();
};

export const addToUploadQueue = async (file: any) => {
  const job: UploadJob = {
    id: Date.now().toString(),
    file,
    status: "pending",
    retries: 0,
  };

  queue.push(job);
  processQueue();

  return job;
};

const processQueue = async () => {
  if (uploading) return;
  uploading = true;

  while (queue.length > 0) {
    const job = queue[0];

    try {
      job.status = "uploading";

      const formData = new FormData();

      // 🔥 IMPORTANT (fix for React Native upload)
      formData.append("file", {
        uri: job.file.uri || job.file,
        name: "reel.mp4",
        type: "video/mp4",
      } as any);

      // 🔥 Replace with your real endpoint
      const res = await fetch("YOUR_UPLOAD_ENDPOINT", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await res.json();

      job.status = "success";
      job.result = data;
    } catch (err) {
      job.retries++;

      if (job.retries < 3) {
        job.status = "pending";
        continue;
      } else {
        job.status = "failed";
      }
    }

    queue.shift();
  }

  uploading = false;
};