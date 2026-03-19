import type { Session } from "@altmanager/lib";

export interface DeviceCodeInfo {
  userCode: string;
  verificationUri: string;
}

export interface AuthResult {
  session: Session;
  skinUrl: string;
  refreshToken: string;
}

export class Auth {
  private static readonly CLIENT_ID = "00000000402b5328";
  private static readonly SCOPE = "service::user.auth.xboxlive.com::MBI_SSL";
  private static readonly XBL_SITE_NAME = "user.auth.xboxlive.com";
  private static readonly XBL_RELYING_PARTY = "http://auth.xboxlive.com";
  private static readonly XSTS_RELYING_PARTY =
    "rp://api.minecraftservices.com/";
  private static readonly GRANT_DEVICE_CODE =
    "urn:ietf:params:oauth:grant-type:device_code";
  private static readonly GRANT_REFRESH_TOKEN = "refresh_token";
  private static readonly POLL_ERROR_WAIT = "authorization_pending";

  private static readonly DEVICE_CODE_URL =
    "https://login.live.com/oauth20_connect.srf";
  private static readonly TOKEN_URL =
    "https://login.live.com/oauth20_token.srf";
  private static readonly XBL_URL =
    "https://user.auth.xboxlive.com/user/authenticate";
  private static readonly XSTS_URL =
    "https://xsts.auth.xboxlive.com/xsts/authorize";
  private static readonly MC_AUTH_URL =
    "https://api.minecraftservices.com/authentication/login_with_xbox";
  private static readonly MC_PROFILE_URL =
    "https://api.minecraftservices.com/minecraft/profile";

  private static readonly FORM_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  private static readonly JSON_HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  public static async authenticate(
    onDeviceCode: (info: DeviceCodeInfo) => void,
  ): Promise<AuthResult> {
    return await Auth.completeAuth(await Auth.getMSToken(onDeviceCode));
  }

  public static async refresh(refreshToken: string): Promise<AuthResult> {
    return await Auth.completeAuth(await Auth.refreshMSToken(refreshToken));
  }

  private static async completeAuth(msToken: {
    access_token: string;
    refresh_token: string;
  }): Promise<AuthResult> {
    const { xblToken, uhs } = await Auth.getXBLToken(msToken.access_token);
    const xstsToken = await Auth.getXSTSToken(xblToken);
    const mcToken = await Auth.getMinecraftToken(uhs, xstsToken);
    const profile = await Auth.getProfile(mcToken);

    return {
      session: {
        token: mcToken,
        uuid: profile.id,
        username: profile.name,
      },
      skinUrl: profile.skins[0]?.url,
      refreshToken: msToken.refresh_token,
    };
  }

  private static async throwIfNotOk(
    res: Response,
    context: string,
  ): Promise<void> {
    if (!res.ok) {
      throw new Error(`${context}: ${res.status} ${await res.text()}`);
    }
  }

  private static async getMSToken(
    onDeviceCode: (info: DeviceCodeInfo) => void,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch(Auth.DEVICE_CODE_URL, {
      method: "POST",
      headers: Auth.FORM_HEADERS,
      body: new URLSearchParams({
        client_id: Auth.CLIENT_ID,
        scope: Auth.SCOPE,
        response_type: "device_code",
      }),
    });

    await Auth.throwIfNotOk(res, "Device code request failed");
    const dc = await res.json();

    onDeviceCode({
      userCode: dc.user_code,
      verificationUri: dc.verification_uri,
    });

    return await Auth.pollForToken(dc.device_code, dc.interval);
  }

  private static async pollForToken(
    deviceCode: string,
    interval: number,
  ): Promise<{ access_token: string; refresh_token: string }> {
    while (true) {
      await new Promise((r) => setTimeout(r, interval * 1000));

      const res = await fetch(Auth.TOKEN_URL, {
        method: "POST",
        headers: Auth.FORM_HEADERS,
        body: new URLSearchParams({
          client_id: Auth.CLIENT_ID,
          grant_type: Auth.GRANT_DEVICE_CODE,
          device_code: deviceCode,
        }),
      });

      const data = await res.json();

      if (res.ok) return data;
      if (data.error !== Auth.POLL_ERROR_WAIT) {
        throw new Error(
          `Auth failed: ${data.error} - ${data.error_description}`,
        );
      }
    }
  }

  private static async refreshMSToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch(Auth.TOKEN_URL, {
      method: "POST",
      headers: Auth.FORM_HEADERS,
      body: new URLSearchParams({
        client_id: Auth.CLIENT_ID,
        grant_type: Auth.GRANT_REFRESH_TOKEN,
        refresh_token: refreshToken,
        scope: Auth.SCOPE,
      }),
    });

    await Auth.throwIfNotOk(res, "Token refresh failed");
    return await res.json();
  }

  private static async getXBLToken(
    accessToken: string,
  ): Promise<{ xblToken: string; uhs: string }> {
    const res = await fetch(Auth.XBL_URL, {
      method: "POST",
      headers: Auth.JSON_HEADERS,
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: Auth.XBL_SITE_NAME,
          RpsTicket: `t=${accessToken}`,
        },
        RelyingParty: Auth.XBL_RELYING_PARTY,
        TokenType: "JWT",
      }),
    });

    await Auth.throwIfNotOk(res, "XBL auth failed");
    const data = await res.json();
    return { xblToken: data.Token, uhs: data.DisplayClaims.xui[0].uhs };
  }

  private static async getXSTSToken(xblToken: string): Promise<string> {
    const res = await fetch(Auth.XSTS_URL, {
      method: "POST",
      headers: Auth.JSON_HEADERS,
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xblToken],
        },
        RelyingParty: Auth.XSTS_RELYING_PARTY,
        TokenType: "JWT",
      }),
    });

    await Auth.throwIfNotOk(res, "XSTS auth failed");
    const data = await res.json();
    return data.Token;
  }

  private static async getMinecraftToken(
    uhs: string,
    xstsToken: string,
  ): Promise<string> {
    const res = await fetch(Auth.MC_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
        ensureLegacyEnabled: true,
      }),
    });

    await Auth.throwIfNotOk(res, "Minecraft auth failed");
    return (await res.json()).access_token;
  }

  private static async getProfile(
    mcToken: string,
  ): Promise<{ id: string; name: string; skins: Array<{ url: string }> }> {
    const res = await fetch(Auth.MC_PROFILE_URL, {
      headers: { Authorization: `Bearer ${mcToken}` },
    });

    await Auth.throwIfNotOk(res, "Profile fetch failed");
    return await res.json();
  }
}
