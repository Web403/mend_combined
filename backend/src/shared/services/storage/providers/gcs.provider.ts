import { Storage } from "@google-cloud/storage";
import { IStorageProvider } from "../../../interfaces";
import { env } from "../../../../config/env";

export class GoogleCloudStorageProvider implements IStorageProvider {
  private storage: Storage;
  private bucket;

  constructor() {
    // const credentials = JSON.parse(
    //   Buffer.from(env.GCP_SA_KEY, "base64").toString("utf-8"),
    // );

    const credentials = "something" as any; // Replace with your actual credentials

    this.storage = new Storage({
      projectId: env.GCP_PROJECT_ID,
      credentials,
    });

    this.bucket = this.storage.bucket(env.GCP_BUCKET_NAME!);
  }

  async upload(file: Express.Multer.File, folder?: string): Promise<string> {
    const fileName = `${folder ?? "uploads"}/${Date.now()}-${file.originalname}`;

    const bucketFile = this.bucket.file(fileName);

    await bucketFile.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });

    return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
  }

  async uploadMany(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<string[]> {
    return Promise.all(files.map((file) => this.upload(file, folder)));
  }

  async delete(url: string): Promise<void> {
    // implement later
  }
}
