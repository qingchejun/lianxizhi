/** repo 的 D1 实现：auth-core 只认这个接口，SQL 全部收在这里。 */
export function repo(db) {
  return {
    async userByEmail(email) {
      return (await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first()) || null
    },
    async userById(id) {
      return (await db.prepare('SELECT * FROM users WHERE id=?').bind(id).first()) || null
    },
    async insertUser(u) {
      await db.prepare('INSERT INTO users(id,email,pw_hash,pw_salt,pwver,verified,created_at) VALUES(?,?,?,?,?,?,?)')
        .bind(u.id, u.email, u.pw_hash, u.pw_salt, u.pwver, u.verified, u.created_at).run()
    },
    async updateUser(id, f) {
      const cur = await this.userById(id)
      if (!cur) return
      await db.prepare('UPDATE users SET pw_hash=?, pw_salt=?, pwver=?, verified=? WHERE id=?')
        .bind(
          f.pw_hash !== undefined ? f.pw_hash : cur.pw_hash,
          f.pw_salt !== undefined ? f.pw_salt : cur.pw_salt,
          f.pwver !== undefined ? f.pwver : cur.pwver,
          f.verified !== undefined ? f.verified : cur.verified,
          id
        ).run()
    },
    async setVerified(id) {
      await db.prepare('UPDATE users SET verified=1 WHERE id=?').bind(id).run()
    },
    async tokenInsert(t) {
      await db.prepare('INSERT INTO tokens(token_hash,user_id,kind,expires_at) VALUES(?,?,?,?)')
        .bind(t.token_hash, t.user_id, t.kind, t.expires_at).run()
    },
    async tokenListByUser(uid, kind) {
      const r = await db.prepare('SELECT * FROM tokens WHERE user_id=? AND kind=?').bind(uid, kind).all()
      return r.results || []
    },
    async tokenGet(hash) {
      return (await db.prepare('SELECT * FROM tokens WHERE token_hash=?').bind(hash).first()) || null
    },
    async tokenUse(hash) {
      await db.prepare('UPDATE tokens SET used_at=1 WHERE token_hash=?').bind(hash).run()
    },
    async tokensClear(uid, kind) {
      await db.prepare('UPDATE tokens SET used_at=1 WHERE user_id=? AND kind=?').bind(uid, kind).run()
    },
    async limitGet(scope, kind) {
      return (await db.prepare('SELECT * FROM limits WHERE scope=? AND kind=?').bind(scope, kind).first()) || null
    },
    async limitSet(scope, kind, row) {
      await db.prepare(
        'INSERT INTO limits(scope,kind,n,ts,until) VALUES(?,?,?,?,?) ' +
        'ON CONFLICT(scope,kind) DO UPDATE SET n=excluded.n, ts=excluded.ts, until=excluded.until'
      ).bind(scope, kind, row.n, row.ts, row.until).run()
    },
    async dataRows(uid) {
      const r = await db.prepare('SELECT key, value, updated_at FROM data WHERE user_id=?').bind(uid).all()
      return (r.results || []).map(x => ({ key: x.key, value: x.value, updated_at: x.updated_at }))
    },
    async dataUpsert(uid, key, value, updated_at) {
      const r = await db.prepare(
        'INSERT INTO data(user_id,key,value,updated_at) VALUES(?,?,?,?) ' +
        'ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at ' +
        'WHERE excluded.updated_at>data.updated_at'
      ).bind(uid, key, value, updated_at).run()
      return !!(r.meta && r.meta.changes > 0)
    }
  }
}
