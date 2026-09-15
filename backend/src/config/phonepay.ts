import { Env, StandardCheckoutClient } from "pg-sdk-node"
import { env as environment } from './env';

const clientId = environment.CLIENT_ID;
const clientSecret = environment.CLIENT_SECRET;
const clientVersion = environment.CLIENT_VERSION;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live

export const PhonePayClient = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);