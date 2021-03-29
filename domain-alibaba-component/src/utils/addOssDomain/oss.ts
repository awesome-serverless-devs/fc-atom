import OSS from 'ali-oss';

interface IOssClient {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  timeout?: number;
}

export default class Oss {
  static async put(
    { region, accessKeyId, accessKeySecret, timeout, bucket }: IOssClient,
    filePath,
  ) {
    const ossCredential = {
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
      timeout: 7200000,
    };

    const ossClient = new OSS(ossCredential);

    await ossClient.put('token', filePath);

    await ossClient.putACL('token', 'public-read');
  }
}
