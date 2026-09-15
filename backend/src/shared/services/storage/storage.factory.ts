import { IStorageProvider } from "../../interfaces";
import { GoogleCloudStorageProvider } from "./providers/gcs.provider";

export class StorageFactory {
    static create(): IStorageProvider {

        let factoryName = "gcs";

        switch(factoryName){

            case "gcs":
                return new GoogleCloudStorageProvider();
            default:
                throw new Error("Invalid storage provider");
        }
    }
}