// "bcryptjs"からbcryptをインポートします。これはパスワードのハッシュ化と検証に使用します。
import bcrypt from "bcryptjs";

// "./db.server"からdbをインポートします。これはデータベースへの接続を管理します。
import { db } from "./db.server";
// "@remix-run/node"からcreateCookieSessionStorageとredirectをインポートします。これらはセッションストレージとリダイレクトを扱います。
import { createCookieSessionStorage, redirect } from "@remix-run/node";

// LoginFormの型を定義します。これはログインフォームから送られてくるデータの形を定義しています。
type LoginForm = {
  password: string;
  username: string;
};

export async function register({ password, username }: LoginForm) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      passwordHash,
      username,
    },
  });
  return {
    id: user.id,
    username,
  };
}

// ログイン処理を行う非同期関数をエクスポートします。
export async function login({ password, username }: LoginForm) {
  // ユーザーネームに一致するユーザーをデータベースから探します。
  const user = await db.user.findUnique({
    where: { username },
  });

  // ユーザーが見つからなかった場合、nullを返します。
  if (!user) {
    return null;
  }

  // ユーザーから送られてきたパスワードとデータベースに保存されているハッシュ化されたパスワードが一致するかを確認します。
  const isCorrectPassword = await bcrypt.compare(password, user.passwordHash);

  // パスワードが一致しなかった場合、nullを返します。
  if (!isCorrectPassword) {
    return null;
  }

  // ユーザーIDとユーザーネームを返します。
  return {
    id: user.id,
    username,
  };
}

// セッションシークレットを環境変数から取得します。
const sessionSecret = process.env.SESSION_SECRET;
// セッションシークレットが設定されていない場合、エラーを投げます。
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

// クッキーベースのセッションストレージを作成します。
const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session", // クッキーの名前を設定します。
    secure: process.env.NODE_ENV === "production", // 本番環境ではセキュアなクッキーを使用します。
    secrets: [sessionSecret], // セッションシークレットを用いてクッキーを署名します。
    sameSite: "lax", // サイト間リクエストの扱いを定義します。
    path: "/", // クッキーのパスを定義します。
    // クッキーの有効期限を設定します。ここでは30日としています。
    maxAge: 60 * 60 * 24 * 30,
    // HTTPのみのクッキーを設定します。これはJavaScriptからのアクセスを防ぎます。
    httpOnly: true,
  },
});

// リクエストからユーザーセッションを取得する関数を定義します。
function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

// リクエストからユーザーIDを取得する非同期関数をエクスポートします。
export async function getUserId(request: Request) {
  // ユーザーセッションを取得します。
  const session = await getUserSession(request);
  // セッションからユーザーIDを取得します。
  const userId = session.get("userId");

  // ユーザーIDが存在しない、または文字列でない場合、nullを返します。
  if (!userId || typeof userId !== "string") {
    return null;
  }

  // ユーザーIDを返します。
  return userId;
}

// ユーザーIDが必要な場合に使用する非同期関数をエクスポートします。ユーザーIDが存在しない場合、ログインページにリダイレクトします。
export async function requiredUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  // ユーザーセッションを取得します。
  const session = await getUserSession(request);
  // セッションからユーザーIDを取得します。
  const userId = session.get("userId");

  // ユーザーIDが存在しない、または文字列でない場合、ログインページにリダイレクトします。
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);

    throw redirect(`/login?${searchParams}`);
  }
  // ユーザーIDを返します。
  return userId;
}

// ユーザーセッションを作成し、リダイレクトする非同期関数をエクスポートします。
export async function createUserSession(userId: string, redirectTo: string) {
  // 新しいセッションを作成します。
  const session = await storage.getSession();
  // セッションにユーザーIDを設定します。
  session.set("userId", userId);

  // リダイレクトします。レスポンスヘッダーにセットクッキーを含めます。
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);

  if (typeof userId !== "string") {
    return null;
  }

  const user = await db.user.findUnique({
    select: { id: true, username: true },
    where: { id: userId },
  });

  if (!user) {
    throw logout(request);
  }

  return user;
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}
