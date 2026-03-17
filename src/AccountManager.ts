import { Authflow, Titles } from "prismarine-auth";
import { Account } from "./Account.ts";
import { OfflineAccount } from "./OfflineAccount.ts";
import type { Session } from "@altmanager/lib";

export class AccountManager {
  private static readonly ACCOUNTS_PATH = ".data/accounts.json";
  private static readonly AUTH_CACHE_DIR = ".data/auth-cache/";

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
        cacheId: string;
      }> = JSON.parse(text);
      for (const entry of raw) {
        this.#accounts.set(
          entry.uuid,
          new OfflineAccount(
            entry.uuid,
            entry.username,
            entry.skinUrl,
            entry.cacheId,
          ),
        );
      }
    } catch {
      // no file yet, start empty
    }
  }

  public async addAccount(
    onDeviceCode: (verificationUri: string, userCode: string) => void,
  ): Promise<Account> {
    const cacheId = crypto.randomUUID();

    const flow = new Authflow(cacheId, AccountManager.AUTH_CACHE_DIR, {
      authTitle: Titles.MinecraftJava,
      flow: "live",
      deviceType: "Win32",
    }, (code) => {
      onDeviceCode(code.verification_uri, code.user_code);
    });

    const result = await flow.getMinecraftJavaToken({ fetchProfile: true });
    const profile = result.profile!;
    const session: Session = {
      token: result.token,
      uuid: profile.id,
      username: profile.name,
    };

    const account = new Account(
      profile.id,
      profile.name,
      profile.skins[0].url,
      cacheId,
      session,
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
      const flow = new Authflow(
        offlineAccount.cacheId,
        AccountManager.AUTH_CACHE_DIR,
        {
          authTitle: Titles.MinecraftJava,
          flow: "live",
          deviceType: "Win32",
        },
      );

      const result = await flow.getMinecraftJavaToken({ fetchProfile: true });
      const profile = result.profile!;
      const session: Session = {
        token: result.token,
        uuid: profile.id,
        username: profile.name,
      };

      const account = new Account(
        offlineAccount.uuid,
        offlineAccount.username,
        offlineAccount.skinUrl,
        offlineAccount.cacheId,
        session,
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
      cacheId: a.cacheId,
    }));
    await Deno.writeTextFile(
      AccountManager.ACCOUNTS_PATH,
      JSON.stringify(data, null, 2),
    );
  }
}
