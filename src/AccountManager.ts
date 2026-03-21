import { Account } from "./Account.ts";
import { OfflineAccount } from "./OfflineAccount.ts";
import type { DeviceCodeInfo } from "./Auth.ts";
import { Auth } from "./Auth.ts";

export class AccountManager {
  private static readonly ACCOUNTS_PATH = ".data/accounts.json";

  readonly #accounts = new Map<string, OfflineAccount>();

  public getAccount(uuid: string): OfflineAccount | null {
    return this.#accounts.get(uuid) ?? null;
  }

  public listAccounts(): OfflineAccount[] {
    return Array.from(this.#accounts.values());
  }

  public async load(): Promise<void> {
    try {
      const text = await Deno.readTextFile(AccountManager.ACCOUNTS_PATH);
      const raw: Array<{
        uuid: string;
        username: string;
        skinUrl: string;
        refreshToken: string;
        lastServer: string | null;
      }> = JSON.parse(text);
      for (const entry of raw) {
        this.#accounts.set(
          entry.uuid,
          new OfflineAccount(
            entry.uuid,
            entry.username,
            entry.skinUrl,
            entry.refreshToken,
            entry.lastServer ?? null,
          ),
        );
      }
    } catch {
      // no file yet, start empty
    }
  }

  public async addAccount(
    onDeviceCode: (info: DeviceCodeInfo) => void,
  ): Promise<Account> {
    const result = await Auth.authenticate(onDeviceCode);

    const account = new Account(
      result.session.uuid,
      result.session.username,
      result.skinUrl,
      result.refreshToken,
      result.session,
      null,
    );

    this.#accounts.set(account.uuid, account);
    await this.persist();
    return account;
  }

  public async login(offlineAccount: OfflineAccount): Promise<Account> {
    if (!this.#accounts.has(offlineAccount.uuid)) {
      throw new Error("Unknown account " + offlineAccount.uuid);
    }

    try {
      const result = await Auth.refresh(offlineAccount.refreshToken);

      const account = new Account(
        offlineAccount.uuid,
        offlineAccount.username,
        offlineAccount.skinUrl,
        result.refreshToken,
        result.session,
        offlineAccount.lastServer,
      );

      this.#accounts.set(account.uuid, account);
      return account;
    } catch {
      this.#accounts.delete(offlineAccount.uuid);
      await this.persist();
      throw new Error("Auth failed, account removed");
    }
  }

  private async persist(): Promise<void> {
    const data = Array.from(this.#accounts.values()).map((a) => ({
      uuid: a.uuid,
      username: a.username,
      skinUrl: a.skinUrl,
      refreshToken: a.refreshToken,
      lastServer: a.lastServer,
    }));
    await Deno.writeTextFile(
      AccountManager.ACCOUNTS_PATH,
      JSON.stringify(data, null, 2),
    );
  }
}
