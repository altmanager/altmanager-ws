import { AccountManager } from "./AccountManager.ts";
import { Account } from "./Account.ts";
import { OfflineAccount } from "./OfflineAccount.ts";

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
        type: "accounts:list",
        accounts: this.accountManager.listAccounts().map((a) => a.toJSON()),
      }),
    );
  }

  private sendAccount(
    socket: WebSocket,
    account: OfflineAccount | null,
    requested: string,
  ): void {
    socket.send(
      JSON.stringify({
        type: "accounts:one",
        account: account,
        request: requested,
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
        case "accounts:add": {
          await this.addAccount(socket);
          break;
        }
        case "accounts:list": {
          this.sendAccounts(socket);
          break;
        }
        case "accounts:get": {
          this.sendAccount(
            socket,
            this.accountManager.getAccount(message.account),
            message.account,
          );
          break;
        }
        case "player:connect": {
          const account = this.accountManager.getAccount(message.account);
          if (account === null) {
            break;
          }

          const onlineAccount = account instanceof Account
            ? account
            : await this.accountManager.login(account);

          if (onlineAccount.lastServer !== null) {
            onlineAccount.disconnect();
          }

          await onlineAccount.connect(message.server);
          this.sendAccounts(socket);
          this.sendAccount(socket, account, message.account);
          break;
        }
        case "player:disconnect": {
          const account = this.accountManager.getAccount(message.account);
          if (account === null) {
            break;
          }

          if (!(account instanceof Account) || account.lastServer === null) {
            break;
          }

          account.disconnect();
          this.sendAccounts(socket);
          this.sendAccount(socket, account, message.account);
          break;
        }
      }
    });
  }

  private onConnect(socket: WebSocket): void {
  }

  private async addAccount(socket: WebSocket): Promise<void> {
    try {
      await this.accountManager.addAccount(({ verificationUri, userCode }) => {
        socket.send(
          JSON.stringify({ type: "accounts:auth", verificationUri, userCode }),
        );
      });

      this.sendAccounts(socket);
    } catch (e) {
      console.error(e);
    }
  }
}
