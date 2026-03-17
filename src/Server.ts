import { AccountManager } from "./AccountManager.ts";

export class Server {
  private readonly accountManager: AccountManager;

  public constructor(accountManager: AccountManager) {
    this.accountManager = accountManager;
  }

  public start(port: number): void {
    Deno.serve({ port }, (req) => {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Not found", { status: 404 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      this.handleConnection(socket);
      return response;
    });
  }

  private sendAccounts(socket: WebSocket): void {
    socket.send(
      JSON.stringify({
        type: "accountList",
        accounts: this.accountManager.listAccounts().map((a) => ({
          uuid: a.uuid,
          username: a.username,
          skinUrl: a.skinUrl,
        })),
      }),
    );
  }

  private handleConnection(socket: WebSocket): void {
    socket.addEventListener("open", () => {
      this.onConnect(socket);
    });

    socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "addAccount": {
          await this.addAccount(socket);
          break;
        }
      }
    });
  }

  private onConnect(socket: WebSocket): void {
    this.sendAccounts(socket);
  }

  private async addAccount(socket: WebSocket): Promise<void> {
    await this.accountManager.addAccount((verificationUri, userCode) => {
      socket.send(
        JSON.stringify({ type: "beginAuth", verificationUri, userCode }),
      );
    });

    this.sendAccounts(socket);
  }
}
