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
      await db.prepare('INSERT INTO users(id,email,pw_hash,pw_salt,pwver,verified,admin,invite_id,created_at,plan,full_until) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .bind(u.id, u.email, u.pw_hash, u.pw_salt, u.pwver, u.verified || 0, u.admin || 0, u.invite_id || null, u.created_at, u.plan || 'free', u.full_until || 0).run()
    },
    /* 改账号版本（注册时带的邀请码补认、管理员手动开通）；inviteId 不给就不动 invite_id */
    async setPlan(id, plan, inviteId) {
      if (inviteId) await db.prepare('UPDATE users SET plan=?, invite_id=? WHERE id=?').bind(plan, inviteId, id).run()
      else await db.prepare('UPDATE users SET plan=? WHERE id=?').bind(plan, id).run()
    },
    /* 补填邀请码：占码 + 升级 + 记开通时间放进同一批（D1 batch 是一个事务）。
       第二句带「这张码确实归我」的条件：码被别人抢先占了，账号就不升级 */
    async redeemInvite(inviteId, uid, now) {
      /* 同一个人同时交两个码：第一句也要求账号还是免费版，不白占第二张码 */
      const r = await db.batch([
        db.prepare("UPDATE invites SET claimed_by=?, claimed_at=?, activated_at=? WHERE id=? AND claimed_by IS NULL AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM users WHERE id=? AND plan='free')")
          .bind(uid, now, now, inviteId, uid),
        db.prepare("UPDATE users SET plan='full', invite_id=? WHERE id=? AND plan='free' AND EXISTS(SELECT 1 FROM invites WHERE id=? AND claimed_by=?)")
          .bind(inviteId, uid, inviteId, uid)
      ])
      return !!(r[1] && r[1].meta && r[1].meta.changes > 0)
    },
    /* 原子计数：窗口（windowStart 之后）内没到 max 就加一并返回 true；到了返回 false。
       一条语句完成，两个请求同时来也不会多放一个 */
    async counterBump(scope, kind, windowStart, max) {
      const row = await db.prepare(
        'INSERT INTO limits(scope,kind,n,ts,until) VALUES(?,?,1,?,0) ' +
        'ON CONFLICT(scope,kind) DO UPDATE SET ' +
        'n = CASE WHEN limits.ts < ?3 THEN 1 ELSE limits.n + 1 END, ' +
        'ts = CASE WHEN limits.ts < ?3 THEN ?3 ELSE limits.ts END ' +
        'WHERE limits.ts < ?3 OR limits.n < ?4 RETURNING n'
      ).bind(scope, kind, windowStart, max).first()
      return !!row
    },
    /* 清理：48 小时没验证的账号（连同验证码、数据、占着的码），以及过期的限流记录。每次最多清 20 个 */
    async purgeUnverified(before, now) {
      const r = await db.prepare('SELECT id FROM users WHERE verified=0 AND admin=0 AND created_at < ? LIMIT 20').bind(before).all()
      const ids = (r.results || []).map(x => x.id)
      const stmts = []
      /* 每句都再确认一次「还没验证」：查出来到删之间刚好有人验证了，就一样都不动 */
      const STILL = ' AND EXISTS(SELECT 1 FROM users WHERE id=? AND verified=0)'
      for (const id of ids) {
        stmts.push(db.prepare('UPDATE invites SET claimed_by=NULL, claimed_at=NULL WHERE claimed_by=? AND activated_at IS NULL' + STILL).bind(id, id))
        stmts.push(db.prepare('DELETE FROM tokens WHERE user_id=?' + STILL).bind(id, id))
        stmts.push(db.prepare('DELETE FROM data WHERE user_id=?' + STILL).bind(id, id))
        stmts.push(db.prepare('DELETE FROM users WHERE id=? AND verified=0').bind(id))
      }
      stmts.push(db.prepare('DELETE FROM limits WHERE until < ? AND ts < ?').bind(now, now - 2 * 86400 * 1000))
      await db.batch(stmts)
      return ids.length
    },
    /* 登录设备（sessions 表，见 auth-core openSession） */
    async sessionGet(id) {
      return await db.prepare('SELECT * FROM sessions WHERE id=?').bind(id).first()
    },
    async sessionInsert(s) {
      await db.prepare('INSERT INTO sessions(id,uid,created_at,last_seen) VALUES(?,?,?,?)').bind(s.id, s.uid, s.created_at, s.last_seen).run()
    },
    async sessionsAlive(uid, since) {
      const r = await db.prepare('SELECT id, last_seen FROM sessions WHERE uid=? AND ended_at IS NULL AND created_at>?').bind(uid, since).all()
      return r.results || []
    },
    async sessionEnd(id, now, reason) {
      await db.prepare('UPDATE sessions SET ended_at=?, ended_reason=? WHERE id=? AND ended_at IS NULL').bind(now, reason, id).run()
    },
    async sessionsEndAll(uid, now, reason) {
      await db.prepare('UPDATE sessions SET ended_at=?, ended_reason=? WHERE uid=? AND ended_at IS NULL').bind(now, reason, uid).run()
    },
    async sessionTouch(id, now) {
      await db.prepare('UPDATE sessions SET last_seen=? WHERE id=?').bind(now, id).run()
    },
    async sessionsPrune(uid, endedBefore, createdBefore) {
      await db.batch([
        db.prepare('DELETE FROM sessions WHERE uid=? AND ((ended_at IS NOT NULL AND ended_at<?) OR created_at<?)').bind(uid, endedBefore, createdBefore),
        /* 结束的记录每个账号最多留 20 条：有人反复登录也撑不大表 */
        db.prepare('DELETE FROM sessions WHERE uid=? AND ended_at IS NOT NULL AND id NOT IN (SELECT id FROM sessions WHERE uid=? AND ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 20)').bind(uid, uid)
      ])
    },
    /* 「开通时通知我」（wants 表，tools/migrate-20261125-wants.sql） */
    async wantAdd(uid, now) {
      await db.prepare('INSERT OR IGNORE INTO wants(uid, created_at) VALUES(?, ?)').bind(uid, now).run()
    },
    async wantAt(uid) {
      const r = await db.prepare('SELECT created_at FROM wants WHERE uid=?').bind(uid).first()
      return r ? r.created_at : null
    },
    /* ---- 订单（完整版年卡，2026-11-28，server/pay-core.js） ---- */
    async orderInsert(o) {
      await db.prepare('INSERT INTO orders(id,uid,email,amount,currency,days,status,created_at) VALUES(?,?,?,?,?,?,?,?)')
        .bind(o.id, o.uid, o.email, o.amount, o.currency, o.days, o.status, o.created_at).run()
    },
    async orderById(id) {
      return await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first()
    },
    async orderSetSession(id, sessionId) {
      await db.prepare('UPDATE orders SET waffo_session=? WHERE id=?').bind(sessionId, id).run()
    },
    async ordersPendingSince(uid, since) {
      const r = await db.prepare("SELECT COUNT(*) AS n FROM orders WHERE uid=? AND status='pending' AND created_at>=?").bind(uid, since).first()
      return r ? r.n : 0
    },
    /* 待付 → 已付 + 账号加天数，一个事务（D1 batch）：记已付只有一次能成功，加天数只跟着那一次走（granted_at 为空才加），
       到期日用 SQL 原子地算：没过期接着加、过期了从 now 算（安全复审 11-28：别读出来再写回去，并发会丢） */
    async orderGrant(id, paymentId, now, uid, ms) {
      await db.batch([
        db.prepare("UPDATE orders SET status='paid', waffo_payment_id=?, paid_at=? WHERE id=? AND status='pending'").bind(paymentId, now, id),
        db.prepare("UPDATE users SET full_until = MAX(?, COALESCE(full_until, 0)) + ? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='paid' AND granted_at IS NULL)")
          .bind(now, ms, uid, id),
        db.prepare("UPDATE orders SET granted_at=? WHERE id=? AND status='paid' AND granted_at IS NULL").bind(now, id)
      ])
      const o = await db.prepare('SELECT granted_at, paid_at FROM orders WHERE id=?').bind(id).first()
      return !!(o && o.granted_at === now && o.paid_at === now)
    },
    async orderMarkMismatch(id, paymentId) {
      await db.prepare("UPDATE orders SET status='mismatch', waffo_payment_id=? WHERE id=? AND status='pending'").bind(paymentId, id).run()
    },
    /* 已付 → 已退 + 扣回天数，一个事务；只扣一次（revoked_at 为空才扣） */
    async orderRevoke(id, ticket, now, uid, ms) {
      await db.batch([
        db.prepare("UPDATE orders SET status='refunded', refund_ticket=?, refunded_at=? WHERE id=? AND status='paid'").bind(ticket || null, now, id),
        db.prepare("UPDATE users SET full_until = MAX(0, COALESCE(full_until, 0) - ?) WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND status='refunded' AND granted_at IS NOT NULL AND revoked_at IS NULL)")
          .bind(ms, uid, id),
        db.prepare("UPDATE orders SET revoked_at=? WHERE id=? AND status='refunded' AND revoked_at IS NULL").bind(now, id)
      ])
      const o = await db.prepare('SELECT revoked_at, refunded_at FROM orders WHERE id=?').bind(id).first()
      return !!(o && o.revoked_at === now && o.refunded_at === now)
    },
    async ordersList(limit) {
      const r = await db.prepare('SELECT o.*, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id=o.uid ORDER BY o.created_at DESC LIMIT ?').bind(limit || 200).all()
      return r.results || []
    },
    async deleteUser(id) {
      await db.batch([
        db.prepare('DELETE FROM data WHERE user_id=?').bind(id),
        db.prepare('DELETE FROM tokens WHERE user_id=?').bind(id),
        db.prepare('DELETE FROM sessions WHERE uid=?').bind(id),
        db.prepare('DELETE FROM wants WHERE uid=?').bind(id),
        db.prepare('DELETE FROM users WHERE id=?').bind(id)
      ])
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
    async setFullUntil(id, t) {
      await db.prepare('UPDATE users SET full_until=? WHERE id=?').bind(t, id).run()
    },
    async setVerified(id) {
      await db.prepare('UPDATE users SET verified=1 WHERE id=?').bind(id).run()
    },
    async setBanned(id, flag) {
      await db.prepare('UPDATE users SET banned=? WHERE id=?').bind(flag, id).run()
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
    async inviteInsert(v) {
      await db.prepare('INSERT INTO invites(id,code,note,created_at) VALUES(?,?,?,?)')
        .bind(v.id, v.code, v.note, v.created_at).run()
    },
    async inviteGetByCode(code) {
      return (await db.prepare('SELECT * FROM invites WHERE code=?').bind(code).first()) || null
    },
    async inviteGetById(id) {
      return (await db.prepare('SELECT * FROM invites WHERE id=?').bind(id).first()) || null
    },
    async inviteClaim(id, uid, now) {
      const r = await db.prepare(
        'UPDATE invites SET claimed_by=?, claimed_at=? WHERE id=? AND claimed_by IS NULL AND revoked_at IS NULL'
      ).bind(uid, now, id).run()
      return !!(r.meta && r.meta.changes > 0)
    },
    async inviteActivate(id, now) {
      await db.prepare('UPDATE invites SET activated_at=? WHERE id=? AND activated_at IS NULL').bind(now, id).run()
    },
    async inviteRevoke(id, now) {
      await db.prepare('UPDATE invites SET revoked_at=? WHERE id=? AND revoked_at IS NULL').bind(now, id).run()
    },
    async inviteSetNote(id, note) {
      await db.prepare('UPDATE invites SET note=? WHERE id=?').bind(note, id).run()
    },
    async sheetRowsSince(since) {
      /* 纸记录（扫码登记）最近有改动的行；admin-core 再按打分时间细数 */
      const r = await db.prepare("SELECT user_id, value FROM data WHERE key LIKE 'sumsum:sheet:v1:%' AND updated_at>=?")
        .bind(since).all()
      return r.results || []
    },
    async usersList() {
      const r = await db.prepare('SELECT id, email, plan, full_until, verified, banned, admin, invite_id, created_at FROM users ORDER BY created_at DESC').all()
      return r.results || []
    },
    async invitesList() {
      const r = await db.prepare(
        'SELECT i.*, u.email AS claimed_email, u.banned AS claimed_banned FROM invites i LEFT JOIN users u ON u.id=i.claimed_by ORDER BY i.created_at DESC'
      ).all()
      return r.results || []
    },
    async dataRows(uid) {
      const r = await db.prepare('SELECT key, value, updated_at FROM data WHERE user_id=?').bind(uid).all()
      return (r.results || []).map(x => ({ key: x.key, value: x.value, updated_at: x.updated_at }))
    },
    async dataDeletePrefixBefore(uid, prefix, before) {
      /* prefix 只来自代码常量，不含 LIKE 通配符 */
      await db.prepare('DELETE FROM data WHERE user_id=? AND key LIKE ? AND updated_at<?')
        .bind(uid, prefix + '%', before).run()
    },
    async dataBytes(uid) {
      const r = await db.prepare('SELECT COALESCE(SUM(LENGTH(value)),0) AS n FROM data WHERE user_id=?').bind(uid).first()
      return r.n
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
