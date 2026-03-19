import { AccountManager } from "./AccountManager.ts";
import { Server } from "./Server.ts";

const accountManager = new AccountManager();
await accountManager.load();

const server = new Server(accountManager);
server.start(Number.parseInt(Deno.env.get("ALTMANAGER_PORT") ?? "14454"));
