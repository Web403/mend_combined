import { JWTPayload } from "./interfaces"

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload
        }
    }
}