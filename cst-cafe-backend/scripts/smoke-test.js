// Quick end-to-end check. Start the server first (npm run dev), then: npm run test:smoke
// Needs STAFF_INVITE_CODE in the environment (same value the server uses).
const BASE = process.env.API_URL || 'http://localhost:5000/api';
const INVITE = process.env.STAFF_INVITE_CODE;
let passed = 0, failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
function check(name, ok, extra = '') {
  if (ok) { passed++; console.log('  ok   ', name); }
  else { failed++; console.log('  FAIL ', name, extra); }
}

(async () => {
  const run = Date.now();
  const email = `test${run}@example.com`;
  const staffEmail = `staff${run}@example.com`;

  console.log('Health & public');
  check('health', (await call('GET', '/health')).status === 200);
  const menu = await call('GET', '/menu');
  check('menu list', menu.status === 200 && menu.data.length > 0);
  const cats = await call('GET', '/menu/categories');
  check('categories', cats.status === 200 && cats.data.length > 0);
  const settings = await call('GET', '/settings');
  check('settings fee', settings.status === 200 && typeof settings.data.takeawayFee === 'number');
  const tables = await call('GET', '/tables');
  check('tables', tables.status === 200 && tables.data.length > 0);

  console.log('Customer auth');
  const su = await call('POST', '/auth/signup', { body: { name: 'Test Student', email, password: 'secret12' } });
  check('signup', su.status === 201 && su.data.token, JSON.stringify(su.data));
  check('duplicate signup 409', (await call('POST', '/auth/signup', { body: { name: 'X', email, password: 'secret12' } })).status === 409);
  check('bad login 401', (await call('POST', '/auth/login', { body: { email, password: 'wrong-pass' } })).status === 401);
  const li = await call('POST', '/auth/login', { body: { email, password: 'secret12' } });
  check('login', li.status === 200 && li.data.token);
  const ctoken = li.data.token;
  check('me', (await call('GET', '/auth/me', { token: ctoken })).status === 200);
  check('no token 401', (await call('GET', '/orders')).status === 401);

  console.log('Staff auth');
  check('staff signup wrong code 403', (await call('POST', '/staff/auth/signup', { body: { name: 'S', email: staffEmail, password: 'staffpass1', inviteCode: 'nope' } })).status === 403);
  const ss = await call('POST', '/staff/auth/signup', { body: { name: 'Test Staff', email: staffEmail, password: 'staffpass1', inviteCode: INVITE } });
  check('staff signup', ss.status === 201 && ss.data.token, JSON.stringify(ss.data));
  const stoken = ss.data?.token;
  check('customer token cannot use staff route', (await call('POST', '/menu', { token: ctoken, body: {} })).status === 403);
  check('staff token cannot place order', (await call('POST', '/orders', { token: stoken, body: {} })).status === 403);

  console.log('Orders');
  const available = menu.data.filter((m) => m.available).slice(0, 2);
  const bad = await call('POST', '/orders', { token: ctoken, body: { orderType: 'takeaway', items: [] } });
  check('empty order 400', bad.status === 400);
  const order = await call('POST', '/orders', {
    token: ctoken,
    body: { orderType: 'takeaway', items: available.map((m) => ({ menuItemId: m.id, quantity: 2 })) },
  });
  check('place takeaway order', order.status === 201 && order.data.id?.startsWith('ORD-'), JSON.stringify(order.data));
  const expected = available.reduce((s, m) => s + m.price * 2, 0) + settings.data.takeawayFee;
  check('server-side total', order.data && Math.abs(order.data.total - expected) < 0.01, `${order.data?.total} vs ${expected}`);
  const code = order.data?.id;
  check('customer sees own order', (await call('GET', `/orders/${code}`, { token: ctoken })).status === 200);
  const staffList = await call('GET', '/orders', { token: stoken });
  check('staff sees queue', staffList.status === 200 && staffList.data.some((o) => o.id === code));
  check('skip step rejected', (await call('PATCH', `/orders/${code}/status`, { token: stoken, body: { status: 'completed' } })).status === 409);
  check('preparing', (await call('PATCH', `/orders/${code}/status`, { token: stoken, body: { status: 'preparing' } })).data?.status === 'preparing');
  check('mark delayed', (await call('PATCH', `/orders/${code}/delayed`, { token: stoken, body: { isDelayed: true } })).data?.status === 'delayed');
  check('customer cannot cancel after prep', (await call('POST', `/orders/${code}/cancel`, { token: ctoken })).status === 409);
  check('ready', (await call('PATCH', `/orders/${code}/status`, { token: stoken, body: { status: 'ready' } })).data?.status === 'ready');
  check('paid', (await call('PATCH', `/orders/${code}/payment`, { token: stoken, body: { isPaid: true } })).data?.isPaid === true);
  check('customer confirms pickup', (await call('POST', `/orders/${code}/pickup`, { token: ctoken })).data?.status === 'completed');
  check('pickup twice rejected', (await call('POST', `/orders/${code}/pickup`, { token: ctoken })).status === 409);

  const o2 = await call('POST', '/orders', { token: ctoken, body: { orderType: 'takeaway', items: [{ menuItemId: available[0].id, quantity: 1 }] } });
  check('cancel own waiting order', (await call('POST', `/orders/${o2.data?.id}/cancel`, { token: ctoken })).data?.status === 'cancelled');

  console.log('Bookings');
  const t = tables.data[0];
  const when = new Date(Date.now() + 3 * 86400000).toISOString();
  const bk = await call('POST', '/bookings', { token: ctoken, body: { tableId: t.id, partySize: 1, time: when, durationMin: 60 } });
  check('book table', bk.status === 201, JSON.stringify(bk.data));
  check('double booking 409', (await call('POST', '/bookings', { token: ctoken, body: { tableId: t.id, partySize: 1, time: when } })).status === 409);
  check('too many people 400', (await call('POST', '/bookings', { token: ctoken, body: { tableId: t.id, partySize: 99, time: when } })).status === 400);
  const avail = await call('GET', `/tables?time=${encodeURIComponent(when)}`);
  check('table shows busy', avail.data?.find((x) => x.id === t.id)?.available === false);
  check('list my bookings', (await call('GET', '/bookings', { token: ctoken })).data?.length >= 1);
  check('cancel booking', (await call('POST', `/bookings/${bk.data?.id}/cancel`, { token: ctoken })).data?.status === 'cancelled');

  console.log('Menu admin, feedback, notifications');
  const created = await call('POST', '/menu', { token: stoken, body: { name: `Test item ${run}`, price: 55, category: cats.data[0].name } });
  check('staff creates item', created.status === 201, JSON.stringify(created.data));
  check('staff marks sold out', (await call('PUT', `/menu/${created.data?.id}`, { token: stoken, body: { available: false } })).data?.available === false);
  check('staff deletes item', (await call('DELETE', `/menu/${created.data?.id}`, { token: stoken })).data?.removed === true);
  check('feedback', (await call('POST', '/feedback', { body: { rating: 5, comment: 'Great' } })).status === 201);
  check('bad rating 400', (await call('POST', '/feedback', { body: { rating: 9 } })).status === 400);
  check('staff reads feedback', (await call('GET', '/feedback', { token: stoken })).data?.count >= 1);
  const notes = await call('GET', '/notifications', { token: stoken });
  check('notifications exist', notes.status === 200 && notes.data.items.length > 0 && notes.data.unread > 0);
  check('read all', (await call('POST', '/notifications/read-all', { token: stoken })).status === 200);
  check('customer blocked from notifications', (await call('GET', '/notifications', { token: ctoken })).status === 403);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
