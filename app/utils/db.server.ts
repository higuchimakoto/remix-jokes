import { PrismaClient } from "@prisma/client";

// PrismaClientのインスタンスであるdbを宣言します。
let db: PrismaClient;

// グローバルなスコープで__db__を宣言します。これはPrismaClientのインスタンスか未定義となります。
declare global {
  var __db__: PrismaClient | undefined;
}

// 開発環境ではサーバーを変更する度に再起動したくないため、この処理が必要です。
// しかし、毎回新しいデータベースへの接続を作成するのも避けたいです。
// 本番環境では、データベースへの単一の接続を持つことになります。
if (process.env.NODE_ENV === "production") {
  // 本番環境では新しいPrismaClientを作成します。
  db = new PrismaClient();
} else {
  // 開発環境では、既に存在しない場合に限り新しいPrismaClientを作成します。
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  // dbにグローバルの__db__を代入します。
  db = global.__db__;
  // データベースへの接続を開始します。
  db.$connect();
}

// dbをエクスポートします。
export { db };
