export interface IStorageProvider {

    upload(
        file: Express.Multer.File,
        folder?: string
    ): Promise<string>;

    uploadMany(
        files: Express.Multer.File[],
        folder?: string
    ): Promise<string[]>;

    delete(url: string): Promise<void>;
}