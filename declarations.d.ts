declare module "pg" {
  export class Pool {
    end() {
      throw new Error('Method not implemented.');
    }
    constructor(config?: any);
    query(queryText: string, values?: any[]): Promise<any>;
  }
}
declare module "mongodb";
declare module "mysql2";
declare module "sqlite3";
declare module "sqlite";
declare module "firebase-admin";
