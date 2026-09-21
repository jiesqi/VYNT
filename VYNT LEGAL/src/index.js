const CLIENT_KEY = "awh7kq529gyf37d2";

const REDIRECT_URI =
  "https://dev.vynttechnologies.workers.dev/oauth/callback";

const TIKTOK_SCOPES = "user.info.basic,video.list";

const TIKTOK_AUTHORIZE_URL =
  "https://www.tiktok.com/v2/auth/authorize/";

const TIKTOK_TOKEN_URL =
  "https://open.tiktokapis.com/v2/oauth/token/";

const TIKTOK_API =
  "https://open.tiktokapis.com/v2";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -----------------------------
    // CONNECT TIKTOK
    // -----------------------------
    if (url.pathname === "/oauth/tiktok") {
      return startTikTokLogin(request);
    }

    // -----------------------------
    // TIKTOK CALLBACK
    // -----------------------------
    if (url.pathname === "/oauth/callback") {
      return handleTikTokCallback(request, env);
    }

    // -----------------------------
    // GET CONNECTED ACCOUNT
    // -----------------------------
    if (url.pathname === "/api/tiktok/account") {
      return getTikTokAccount(env);
    }

    // -----------------------------
    // GET TIKTOK VIDEOS
    // -----------------------------
    if (url.pathname === "/api/tiktok/videos") {
      return getTikTokVideos(env);
    }

    // -----------------------------
    // DISCONNECT TIKTOK
    // -----------------------------
    if (url.pathname === "/api/tiktok/disconnect") {
      return disconnectTikTok(env);
    }

    // -----------------------------
    // API 404
    // -----------------------------
    if (url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/oauth/")) {
      return json(
        {
          error: "Not found"
        },
        404
      );
    }

    // -----------------------------
    // STATIC WEBSITE
    // -----------------------------
    return env.ASSETS.fetch(request);
  }
};


// ============================================
// START TIKTOK LOGIN
// ============================================

async function startTikTokLogin(request) {
  const state = crypto.randomUUID();

  const authURL = new URL(TIKTOK_AUTHORIZE_URL);

  authURL.searchParams.set("client_key", CLIENT_KEY);
  authURL.searchParams.set("response_type", "code");
  authURL.searchParams.set("scope", TIKTOK_SCOPES);
  authURL.searchParams.set("redirect_uri", REDIRECT_URI);
  authURL.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authURL.toString(),

      "Set-Cookie":
        `tiktok_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`
    }
  });
}


// ============================================
// HANDLE TIKTOK CALLBACK
// ============================================

async function handleTikTokCallback(request, env) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription =
    url.searchParams.get("error_description");

  if (error) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>VYNT - TikTok Connection Error</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body {
            background:#08090c;
            color:white;
            font-family:Arial,sans-serif;
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100vh;
            padding:20px;
          }

          .box {
            max-width:600px;
            background:#101217;
            border:1px solid #24272e;
            border-radius:16px;
            padding:30px;
          }

          a {
            color:#7dd3fc;
          }
        </style>
      </head>

      <body>
        <div class="box">
          <h1>TikTok connection failed</h1>
          <p>${escapeHTML(errorDescription || error)}</p>
          <p><a href="/">Return to VYNT</a></p>
        </div>
      </body>
      </html>
      `,
      {
        status: 400,
        headers: {
          "Content-Type": "text/html;charset=UTF-8"
        }
      }
    );
  }

  if (!code || !returnedState) {
    return new Response("Missing TikTok authorization data.", {
      status: 400
    });
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const savedState = cookies.tiktok_state;

  if (!savedState || savedState !== returnedState) {
    return new Response("Invalid OAuth state.", {
      status: 403
    });
  }

  if (!env.TIKTOK_CLIENT_SECRET) {
    return new Response(
      "TIKTOK_CLIENT_SECRET is not configured in Cloudflare.",
      {
        status: 500
      }
    );
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",

    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded"
    },

    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    return new Response(
      `
      <h1>TikTok token exchange failed</h1>
      <pre>${escapeHTML(JSON.stringify(tokenData, null, 2))}</pre>
      <a href="/">Return to VYNT</a>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html;charset=UTF-8"
        }
      }
    );
  }

  // Get TikTok profile
  const profileResponse = await fetch(
    `${TIKTOK_API}/user/info/?fields=open_id,avatar_url,display_name,profile_deep_link,bio_description`,
    {
      headers: {
        Authorization:
          `Bearer ${tokenData.access_token}`
      }
    }
  );

  const profileData = await profileResponse.json();

  const user =
    profileData.data?.user || {};

  const now = Math.floor(Date.now() / 1000);

  const accessExpires =
    now + Number(tokenData.expires_in || 86400);

  const refreshExpires =
    now + Number(tokenData.refresh_expires_in || 31536000);

  // Save account
  await env.DB.prepare(`
    INSERT INTO tiktok_accounts (
      open_id,
      display_name,
      avatar_url,
      profile_url,
      access_token,
      refresh_token,
      access_token_expires_at,
      refresh_token_expires_at,
      scopes,
      created_at,
      updated_at
    )

    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    ON CONFLICT(open_id)
    DO UPDATE SET
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      profile_url = excluded.profile_url,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      access_token_expires_at = excluded.access_token_expires_at,
      refresh_token_expires_at = excluded.refresh_token_expires_at,
      scopes = excluded.scopes,
      updated_at = excluded.updated_at
  `)
    .bind(
      tokenData.open_id,
      user.display_name || "",
      user.avatar_url || "",
      user.profile_deep_link || "",
      tokenData.access_token,
      tokenData.refresh_token,
      accessExpires,
      refreshExpires,
      tokenData.scope || TIKTOK_SCOPES,
      now,
      now
    )
    .run();

  return new Response(
    `
    <!DOCTYPE html>
    <html>

    <head>
      <title>VYNT - TikTok Connected</title>

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      />

      <style>
        body {
          background:#08090c;
          color:#fff;
          font-family:Arial,sans-serif;
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:100vh;
          margin:0;
          padding:20px;
        }

        .box {
          max-width:600px;
          width:100%;
          background:#101217;
          border:1px solid #24272e;
          border-radius:18px;
          padding:35px;
          text-align:center;
        }

        img {
          width:90px;
          height:90px;
          border-radius:50%;
          object-fit:cover;
        }

        a {
          display:inline-block;
          margin-top:20px;
          padding:12px 20px;
          background:#fff;
          color:#000;
          text-decoration:none;
          border-radius:10px;
          font-weight:bold;
        }
      </style>
    </head>

    <body>

      <div class="box">

        <h1>TikTok Connected</h1>

        ${
          user.avatar_url
            ? `<img src="${escapeHTML(user.avatar_url)}">`
            : ""
        }

        <h2>
          ${escapeHTML(user.display_name || "TikTok Account")}
        </h2>

        <p>
          Your TikTok account has been successfully
          connected to VYNT.
        </p>

        <a href="/">
          Return to VYNT
        </a>

      </div>

    </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",

        "Set-Cookie":
          "tiktok_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax"
      }
    }
  );
}


// ============================================
// GET ACCOUNT
// ============================================

async function getTikTokAccount(env) {
  const account = await env.DB.prepare(`
    SELECT
      open_id,
      display_name,
      avatar_url,
      profile_url,
      scopes,
      access_token_expires_at
    FROM tiktok_accounts
    ORDER BY updated_at DESC
    LIMIT 1
  `).first();

  if (!account) {
    return json({
      connected: false
    });
  }

  return json({
    connected: true,
    account
  });
}


// ============================================
// GET VIDEOS
// ============================================

async function getTikTokVideos(env) {
  const account = await getStoredAccount(env);

  if (!account) {
    return json(
      {
        error: "No TikTok account connected."
      },
      404
    );
  }

  const accessToken =
    await ensureValidAccessToken(account, env);

  const response = await fetch(
    `${TIKTOK_API}/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link,create_time`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        max_count: 20
      })
    }
  );

  const data = await response.json();

  return json(data, response.status);
}


// ============================================
// REFRESH ACCESS TOKEN
// ============================================

async function ensureValidAccessToken(account, env) {
  const now = Math.floor(Date.now() / 1000);

  // Token still has 5 minutes remaining
  if (
    account.access_token_expires_at &&
    account.access_token_expires_at > now + 300
  ) {
    return account.access_token;
  }

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",

    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded"
    },

    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token
    })
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      "TikTok access token refresh failed."
    );
  }

  const newExpires =
    now + Number(data.expires_in || 86400);

  const newRefreshToken =
    data.refresh_token || account.refresh_token;

  await env.DB.prepare(`
    UPDATE tiktok_accounts

    SET
      access_token = ?,
      refresh_token = ?,
      access_token_expires_at = ?,
      scopes = ?,
      updated_at = ?

    WHERE id = ?
  `)
    .bind(
      data.access_token,
      newRefreshToken,
      newExpires,
      data.scope || account.scopes,
      now,
      account.id
    )
    .run();

  return data.access_token;
}


// ============================================
// DISCONNECT
// ============================================

async function disconnectTikTok(env) {
  const account = await getStoredAccount(env);

  if (!account) {
    return json({
      disconnected: true
    });
  }

  // Revoke TikTok authorization
  if (env.TIKTOK_CLIENT_SECRET) {
    try {
      await fetch(
        "https://open.tiktokapis.com/v2/oauth/revoke/",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body: new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret:
              env.TIKTOK_CLIENT_SECRET,
            token: account.access_token
          })
        }
      );
    } catch (_) {
      // Continue deleting local data
    }
  }

  await env.DB.prepare(`
    DELETE FROM tiktok_accounts
    WHERE id = ?
  `)
    .bind(account.id)
    .run();

  return json({
    disconnected: true
  });
}


// ============================================
// DATABASE HELPER
// ============================================

async function getStoredAccount(env) {
  return await env.DB.prepare(`
    SELECT *
    FROM tiktok_accounts
    ORDER BY updated_at DESC
    LIMIT 1
  `).first();
}


// ============================================
// COOKIE PARSER
// ============================================

function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [key, ...value] = cookie.trim().split("=");

    if (key) {
      cookies[key] = value.join("=");
    }
  }

  return cookies;
}


// ============================================
// JSON RESPONSE
// ============================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,

      headers: {
        "Content-Type":
          "application/json;charset=UTF-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}


// ============================================
// HTML ESCAPING
// ============================================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
