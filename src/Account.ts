import type { Session } from "@altmanager/lib";
import { Player, PlayerStatus } from "@altmanager/lib";
import { OfflineAccount } from "./OfflineAccount.ts";

export class Account extends OfflineAccount {
  public readonly player: Player;
  private reconnectAttempts = 0;

  public constructor(
    uuid: string,
    username: string,
    skinUrl: string,
    refreshToken: string,
    session: Session,
    lastServer: string | null,
    autoReconnect: boolean,
  ) {
    super(uuid, username, skinUrl, refreshToken, lastServer, autoReconnect);
    this.player = new Player(session);

    this.player.addEventListener("statusChange", () => {
      if (this.player.status === PlayerStatus.ONLINE) {
        setTimeout(() => {
          if (this.player.status !== PlayerStatus.ONLINE) {
            return;
          }
          this.reconnectAttempts = 0;
        }, 60_000);

        if (this.player.health <= 0) {
          this.player.respawn().then();
        }

        return;
      }

      if (
        this.autoReconnect === false ||
        this.player.status !== PlayerStatus.DISCONNECTED ||
        this.lastServer === null
      ) {
        return;
      }

      const delay = 2 ** this.reconnectAttempts * 1000;
      this.reconnectAttempts++;

      setTimeout(
        () => this.connect(this.lastServer!).catch(console.error),
        delay,
      );
    });
  }

  public async connect(address: string): Promise<void> {
    try {
      await this.player.connect(address);
      this._lastServer = address;
    } catch (e) {
      console.error(e);
    }
  }

  public disconnect(): void {
    this.player.disconnect();
    this._lastServer = null;
    this.reconnectAttempts = 0;
  }

  public override toJSON(): Record<string, unknown> {
    const data = super.toJSON();

    data.status = this.player.status;

    return data;
  }
}
